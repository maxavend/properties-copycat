// This plugin shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 320, height: 400, themeColors: true });

// --- Interfaces for Hierarchical Snapshot ---

interface TextData {
  characters: string;
  textStyleId: string | typeof figma.mixed;
  fontName: FontName | typeof figma.mixed;
  fontSize: number | typeof figma.mixed;
  fills: readonly Paint[] | typeof figma.mixed;
  textAlignHorizontal: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textAlignVertical: "TOP" | "CENTER" | "BOTTOM";
  textAutoResize: "NONE" | "WIDTH_AND_HEIGHT" | "HEIGHT" | "TRUNCATE";
}

interface LayoutData {
  layoutMode: "NONE" | "HORIZONTAL" | "VERTICAL";
  primaryAxisAlignItems: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems: "MIN" | "CENTER" | "MAX" | "BASELINE";
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  itemSpacing: number;
  layoutAlign: "STRETCH" | "INHERIT" | "MIN" | "CENTER" | "MAX";
  layoutGrow: number;
  primaryAxisSizingMode: "FIXED" | "AUTO";
  counterAxisSizingMode: "FIXED" | "AUTO";
  boundVariables?: { [key: string]: VariableAlias | VariableAlias[] };
}

interface NodeSnapshot {
  name: string;
  type: string;
  properties?: { [key: string]: string | boolean }; // Only for INSTANCE
  textData?: TextData; // Only for TEXT
  layoutData?: LayoutData; // For nodes with layout
  boundVariables?: { [key: string]: VariableAlias | VariableAlias[] };
  children: NodeSnapshot[];
}

let rootSnapshot: NodeSnapshot | null = null;
let pasteCounter = 0;
let totalNodesInSnapshot = 0;

// --- Helper Functions ---

function notifyUI(message: string, timeout?: number) {
  figma.ui.postMessage({ type: 'status', message, timeout });
}

function sendProgress(value: number, label?: string) {
  figma.ui.postMessage({ type: 'progress', value, label });
}

function sendSelectionInfo() {
  const selection = figma.currentPage.selection;
  const info = selection.map(node => ({
    id: node.id,
    name: node.name,
    type: node.type
  }));
  figma.ui.postMessage({ type: 'selection-update', selection: info });
}

// Recursively create a snapshot of a node and its entire hierarchy
function createSnapshot(node: SceneNode): NodeSnapshot {
  const snapshot: NodeSnapshot = {
    name: node.name,
    type: node.type,
    children: []
  };

  if (node.type === 'INSTANCE') {
    const props: { [key: string]: string | boolean } = {};
    if (node.componentProperties) {
      for (const key in node.componentProperties) {
        props[key] = node.componentProperties[key].value;
      }
    }
    snapshot.properties = props;
  } else if (node.type === 'TEXT') {
    snapshot.textData = {
      characters: node.characters,
      textStyleId: node.textStyleId,
      fontName: node.fontName as FontName,
      fontSize: node.fontSize as number,
      fills: node.fills as Paint[],
      textAlignHorizontal: node.textAlignHorizontal,
      textAlignVertical: node.textAlignVertical,
      textAutoResize: node.textAutoResize
    };
  }

  if ('layoutMode' in node) {
    const lNode = node as FrameNode; // Typing as FrameNode for convenience
    snapshot.layoutData = {
      layoutMode: lNode.layoutMode as any,
      primaryAxisAlignItems: lNode.primaryAxisAlignItems as any,
      counterAxisAlignItems: lNode.counterAxisAlignItems as any,
      paddingLeft: lNode.paddingLeft,
      paddingRight: lNode.paddingRight,
      paddingTop: lNode.paddingTop,
      paddingBottom: lNode.paddingBottom,
      itemSpacing: lNode.itemSpacing,
      layoutAlign: lNode.layoutAlign as any,
      layoutGrow: lNode.layoutGrow,
      primaryAxisSizingMode: lNode.primaryAxisSizingMode as any,
      counterAxisSizingMode: lNode.counterAxisSizingMode as any
    };
  }

  if ('boundVariables' in node && node.boundVariables) {
    try {
      snapshot.boundVariables = JSON.parse(JSON.stringify(node.boundVariables));
    } catch (e) { }
  }

  if ("children" in node) {
    for (const child of node.children) {
      snapshot.children.push(createSnapshot(child));
    }
  }

  return snapshot;
}

// Get count of nodes that have properties in a snapshot
function getInstancesWithProps(snapshot: NodeSnapshot, list: string[] = []): string[] {
  if (snapshot.properties && Object.keys(snapshot.properties).length > 0) {
    list.push(snapshot.name);
  }
  for (const child of snapshot.children) {
    getInstancesWithProps(child, list);
  }
  return list;
}

function countNodes(s: NodeSnapshot): number {
  return 1 + s.children.reduce((a, b) => a + countNodes(b), 0);
}

// Recursively apply a snapshot to a target tree
async function applySnapshot(target: SceneNode, snapshot: NodeSnapshot, totalTargetNodes: number) {
  pasteCounter++;

  // Periodically send progress for smoother UI
  if (pasteCounter % 5 === 0) {
    sendProgress(pasteCounter / totalTargetNodes);
  }

  if (target.type === 'INSTANCE' && snapshot.type === 'INSTANCE' && snapshot.properties) {
    try {
      if (Object.keys(snapshot.properties).length > 0) {
        await target.setProperties(snapshot.properties);
      }
    } catch (e) {
      console.warn("Failed to set properties on", target.name, e);
    }
  }

  if (target.type === 'TEXT' && snapshot.type === 'TEXT' && snapshot.textData) {
    const data = snapshot.textData;
    try {
      if (target.fontName !== figma.mixed) await figma.loadFontAsync(target.fontName);
      if (data.fontName !== figma.mixed && data.fontName) await figma.loadFontAsync(data.fontName);

      target.characters = data.characters;

      if (data.textStyleId !== figma.mixed && data.textStyleId) {
        target.textStyleId = data.textStyleId;
      } else {
        if (data.fontName !== figma.mixed) target.fontName = data.fontName;
        if (data.fontSize !== figma.mixed) target.fontSize = data.fontSize;
        if (data.fills !== figma.mixed) target.fills = data.fills;
      }
      target.textAlignHorizontal = data.textAlignHorizontal;
      target.textAlignVertical = data.textAlignVertical;
      target.textAutoResize = data.textAutoResize;
    } catch (e) {
      console.warn("Failed to set text data on", target.name, e);
    }
  }

  if (snapshot.layoutData && 'layoutMode' in target) {
    try {
      const ld = snapshot.layoutData;
      const t = target as FrameNode;
      t.layoutMode = ld.layoutMode;
      t.primaryAxisAlignItems = ld.primaryAxisAlignItems as any;
      t.counterAxisAlignItems = ld.counterAxisAlignItems as any;
      t.paddingLeft = ld.paddingLeft;
      t.paddingRight = ld.paddingRight;
      t.paddingTop = ld.paddingTop;
      t.paddingBottom = ld.paddingBottom;
      t.itemSpacing = ld.itemSpacing;
      t.layoutAlign = ld.layoutAlign as any;
      t.layoutGrow = ld.layoutGrow;

      // Resizing Hug/Fixed
      if (ld.primaryAxisSizingMode) t.primaryAxisSizingMode = ld.primaryAxisSizingMode;
      if (ld.counterAxisSizingMode) t.counterAxisSizingMode = ld.counterAxisSizingMode;
    } catch (e) {
      console.warn("Failed to set layout on", target.name, e);
    }
  }

  // Apply Tokens (Variables) to any node type
  if (snapshot.boundVariables) {
    for (const [prop, variable] of Object.entries(snapshot.boundVariables)) {
      try {
        (target as any).setBoundVariable(prop as any, variable as any);
      } catch (e) { /* silent fail for incompatible vars */ }
    }
  }

  if ("children" in target && snapshot.children.length > 0) {
    const targetChildren = target.children;
    for (let i = 0; i < snapshot.children.length; i++) {
      if (i < targetChildren.length) {
        await applySnapshot(targetChildren[i], snapshot.children[i], totalTargetNodes);
      }
    }
  }
}

// --- Main Message Listener ---

figma.on('selectionchange', () => {
  sendSelectionInfo();
});

sendSelectionInfo();

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'copy-properties') {
    const selection = figma.currentPage.selection;
    if (selection.length !== 1 || selection[0].type !== 'INSTANCE') {
      notifyUI("Selecciona exactamente una instancia.");
      return;
    }

    try {
      notifyUI("Copiando estructura profunda...");
      rootSnapshot = createSnapshot(selection[0]);
      totalNodesInSnapshot = countNodes(rootSnapshot);

      // Get names of instances that actually have properties
      const instances = getInstancesWithProps(rootSnapshot);
      // Remove duplicates and keep it clean
      const uniqueInstances = Array.from(new Set(instances));

      notifyUI(`Estructura copiada.`);

      figma.ui.postMessage({
        type: 'properties-copied',
        instances: uniqueInstances
      });
    } catch (err) {
      console.error(err);
      notifyUI("Error al copiar.");
    }
  }

  if (msg.type === 'paste-properties') {
    if (!rootSnapshot) {
      notifyUI("No hay datos copiados.");
      return;
    }

    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      notifyUI("Selecciona destinos.");
      return;
    }

    const instancesToPaste = selection.filter(n => n.type === 'INSTANCE');
    if (instancesToPaste.length === 0) {
      notifyUI("Selecciona instancias válidas.");
      return;
    }

    const totalWork = instancesToPaste.length * totalNodesInSnapshot;
    pasteCounter = 0;

    notifyUI("Sincronizando...");
    sendProgress(0, "Sincronizando componentes...");

    for (const node of instancesToPaste) {
      try {
        await applySnapshot(node, rootSnapshot, totalWork);
      } catch (err) {
        console.warn("Paste error", err);
      }
    }

    sendProgress(1, "Finalizado");
    notifyUI(`¡Sincronización completa!`);
  }
};
