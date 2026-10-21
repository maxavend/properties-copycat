// This plugin shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 320, height: 400, themeColors: true });

// --- Interfaces for Hierarchical Snapshot ---

type ComponentPropertyValue = string | boolean | VariableAlias;
type AutoLayoutNode = Extract<SceneNode, { layoutMode: unknown }>;

interface TextData {
  characters: string;
  textStyleId: string | typeof figma.mixed;
  fillStyleId: string | typeof figma.mixed;
  fontName: FontName | typeof figma.mixed;
  fontSize: number | typeof figma.mixed;
  fills: readonly Paint[] | typeof figma.mixed;
  textAlignHorizontal: TextNode['textAlignHorizontal'];
  textAlignVertical: TextNode['textAlignVertical'];
  textAutoResize: TextNode['textAutoResize'];
}

// layoutMode goes first: the remaining fields depend on it.
const LAYOUT_KEYS = [
  'layoutMode',
  'primaryAxisAlignItems',
  'counterAxisAlignItems',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'itemSpacing',
  'layoutAlign',
  'layoutGrow',
  'primaryAxisSizingMode',
  'counterAxisSizingMode'
] as const;

type LayoutKey = typeof LAYOUT_KEYS[number];
type LayoutData = Pick<FrameNode, LayoutKey>;

// Variables bound on the source node, resolved per field so they can be re-bound with a Variable object.
interface VariableBindings {
  node: { field: VariableBindableNodeField; id: string }[];
  text: { field: VariableBindableTextField; id: string }[];
  fills?: (string | null)[]; // Color variable per paint index
  strokes?: (string | null)[];
}

interface NodeSnapshot {
  name: string;
  type: string;
  properties?: { [key: string]: ComponentPropertyValue }; // Only for INSTANCE
  textData?: TextData; // Only for TEXT
  layoutData?: LayoutData; // For nodes with layout
  variables?: VariableBindings;
  children: NodeSnapshot[];
}

let rootSnapshot: NodeSnapshot | null = null;
let rootFamily: string | null = null;
let pasteCounter = 0;
let totalNodesInSnapshot = 0;

// Per-paste state
let failures: string[] = [];
let unmatchedLayers = 0;
const variableCache = new Map<string, Variable>();

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

// Run one write and record the failure instead of aborting the rest of the node
async function attempt(label: string, fn: () => void | Promise<void>) {
  try {
    await fn();
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    failures.push(`${label}: ${reason}`);
    console.warn(label, e);
  }
}

// Identifies which component (or component set, for variants) an instance comes from
async function getComponentFamily(instance: InstanceNode): Promise<string | null> {
  const main = await instance.getMainComponentAsync();
  if (!main) return null;
  if (main.parent && main.parent.type === 'COMPONENT_SET') return `set:${main.parent.key}`;
  // Remote variants may come without their parent set; fall back to the property signature
  if (main.variantProperties) {
    return `props:${Object.keys(instance.componentProperties).sort().join('|')}`;
  }
  return `component:${main.key}`;
}

async function getVariable(id: string): Promise<Variable> {
  const cached = variableCache.get(id);
  if (cached) return cached;
  const variable = await figma.variables.getVariableByIdAsync(id);
  if (!variable) throw new Error(`variable ${id} no encontrada`);
  variableCache.set(id, variable);
  return variable;
}

function getPaintVariableIds(paints: readonly Paint[]): (string | null)[] | undefined {
  const ids = paints.map(p => (p.type === 'SOLID' && p.boundVariables?.color?.id) || null);
  return ids.some(id => id) ? ids : undefined;
}

function getVariableBindings(node: SceneNode): VariableBindings | undefined {
  const bindings: VariableBindings = { node: [], text: [] };

  for (const [field, value] of Object.entries(node.boundVariables ?? {})) {
    if (field === 'fills' || field === 'strokes' || field === 'effects' || field === 'layoutGrids' ||
      field === 'textRangeFills' || field === 'componentProperties') {
      continue; // Paints are read from the paints themselves; component properties travel with setProperties
    }
    if (Array.isArray(value)) {
      // Text fields hold one alias per range; only a single variable for the whole text can be re-bound
      const ids = new Set(value.map((alias: VariableAlias) => alias.id));
      if (ids.size === 1) bindings.text.push({ field: field as VariableBindableTextField, id: value[0].id });
    } else if (value && 'id' in value) {
      bindings.node.push({ field: field as VariableBindableNodeField, id: (value as VariableAlias).id });
    }
  }

  // Text fills are copied whole (bindings included), so only other nodes need paint variables
  if (node.type !== 'TEXT') {
    if ('fills' in node && node.fills !== figma.mixed) bindings.fills = getPaintVariableIds(node.fills);
    if ('strokes' in node) bindings.strokes = getPaintVariableIds(node.strokes);
  }

  const empty = !bindings.node.length && !bindings.text.length && !bindings.fills && !bindings.strokes;
  return empty ? undefined : bindings;
}

// Recursively create a snapshot of a node and its entire hierarchy
function createSnapshot(node: SceneNode): NodeSnapshot {
  const snapshot: NodeSnapshot = {
    name: node.name,
    type: node.type,
    children: []
  };

  if (node.type === 'INSTANCE') {
    const props: { [key: string]: ComponentPropertyValue } = {};
    if (node.componentProperties) {
      for (const key in node.componentProperties) {
        const prop = node.componentProperties[key];
        props[key] = prop.boundVariables?.value ?? prop.value;
      }
    }
    snapshot.properties = props;
  } else if (node.type === 'TEXT') {
    snapshot.textData = {
      characters: node.characters,
      textStyleId: node.textStyleId,
      fillStyleId: node.fillStyleId,
      fontName: node.fontName,
      fontSize: node.fontSize,
      fills: node.fills,
      textAlignHorizontal: node.textAlignHorizontal,
      textAlignVertical: node.textAlignVertical,
      textAutoResize: node.textAutoResize
    };
  }

  if ('layoutMode' in node) {
    snapshot.layoutData = {
      layoutMode: node.layoutMode,
      primaryAxisAlignItems: node.primaryAxisAlignItems,
      counterAxisAlignItems: node.counterAxisAlignItems,
      paddingLeft: node.paddingLeft,
      paddingRight: node.paddingRight,
      paddingTop: node.paddingTop,
      paddingBottom: node.paddingBottom,
      itemSpacing: node.itemSpacing,
      layoutAlign: node.layoutAlign,
      layoutGrow: node.layoutGrow,
      primaryAxisSizingMode: node.primaryAxisSizingMode,
      counterAxisSizingMode: node.counterAxisSizingMode
    };
  }

  snapshot.variables = getVariableBindings(node);

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

// Pair snapshot children with target children by type and name, in order, so a
// different layer order or an extra layer in the target doesn't shift the data
function matchChildren(targetChildren: readonly SceneNode[], snapshots: NodeSnapshot[]) {
  const used = new Set<SceneNode>();
  const pairs: [SceneNode, NodeSnapshot][] = [];
  const unmatched: NodeSnapshot[] = [];

  for (const snapshot of snapshots) {
    const match = targetChildren.find(c => !used.has(c) && c.type === snapshot.type && c.name === snapshot.name);
    if (match) {
      used.add(match);
      pairs.push([match, snapshot]);
    } else {
      unmatched.push(snapshot);
    }
  }
  return { pairs, unmatched };
}

async function loadTextFonts(target: TextNode, data: TextData) {
  const fonts: FontName[] = target.characters.length > 0
    ? target.getRangeAllFontNames(0, target.characters.length)
    : target.fontName !== figma.mixed ? [target.fontName] : [];

  if (data.fontName !== figma.mixed) fonts.push(data.fontName);
  if (typeof data.textStyleId === 'string' && data.textStyleId) {
    const style = await figma.getStyleByIdAsync(data.textStyleId);
    if (style && style.type === 'TEXT') fonts.push(style.fontName);
  }

  const unique = new Map(fonts.map(f => [`${f.family}/${f.style}`, f]));
  await Promise.all(Array.from(unique.values()).map(f => figma.loadFontAsync(f)));
}

async function applyText(target: TextNode, data: TextData) {
  const label = `Texto "${target.name}"`;

  await attempt(`${label} (fuentes)`, () => loadTextFonts(target, data));

  await attempt(`${label} (contenido)`, () => {
    if (target.characters !== data.characters) target.characters = data.characters;
  });

  if (typeof data.textStyleId === 'string') {
    if (data.textStyleId) {
      await attempt(`${label} (estilo)`, async () => {
        if (target.textStyleId !== data.textStyleId) await target.setTextStyleIdAsync(data.textStyleId as string);
      });
    } else {
      await attempt(`${label} (tipografía)`, async () => {
        if (target.textStyleId !== '') await target.setTextStyleIdAsync('');
        if (data.fontName !== figma.mixed) target.fontName = data.fontName;
        if (data.fontSize !== figma.mixed && target.fontSize !== data.fontSize) target.fontSize = data.fontSize;
      });
    }
  }

  // A text style doesn't include color, so fills are applied either way
  await attempt(`${label} (color)`, async () => {
    if (typeof data.fillStyleId === 'string' && data.fillStyleId) {
      if (target.fillStyleId !== data.fillStyleId) await target.setFillStyleIdAsync(data.fillStyleId);
    } else if (data.fills !== figma.mixed && JSON.stringify(target.fills) !== JSON.stringify(data.fills)) {
      target.fills = data.fills;
    }
  });

  await attempt(`${label} (alineación)`, () => {
    if (target.textAlignHorizontal !== data.textAlignHorizontal) target.textAlignHorizontal = data.textAlignHorizontal;
    if (target.textAlignVertical !== data.textAlignVertical) target.textAlignVertical = data.textAlignVertical;
    if (target.textAutoResize !== data.textAutoResize) target.textAutoResize = data.textAutoResize;
  });
}

function writeLayoutField<K extends LayoutKey>(target: AutoLayoutNode, key: K, value: LayoutData[K]) {
  const node = target as LayoutData;
  if (node[key] !== value) node[key] = value;
}

async function applyLayout(target: AutoLayoutNode, layout: LayoutData) {
  for (const key of LAYOUT_KEYS) {
    await attempt(`Layout "${target.name}" (${key})`, () => writeLayoutField(target, key, layout[key]));
  }
}

// Returns a re-bound copy of the paints, or null when nothing changes
async function bindPaintVariables(paints: readonly Paint[], ids: (string | null)[]): Promise<Paint[] | null> {
  let changed = false;
  const next: Paint[] = [];
  for (let i = 0; i < paints.length; i++) {
    const paint = paints[i];
    const id = ids[i];
    if (id && paint.type === 'SOLID' && paint.boundVariables?.color?.id !== id) {
      next.push(figma.variables.setBoundVariableForPaint(paint, 'color', await getVariable(id)));
      changed = true;
    } else {
      next.push(paint);
    }
  }
  return changed ? next : null;
}

async function applyVariables(target: SceneNode, bindings: VariableBindings, hasTextStyle: boolean) {
  const label = `Variable en "${target.name}"`;
  const current = (target.boundVariables ?? {}) as { [field: string]: VariableAlias | VariableAlias[] | undefined };

  for (const { field, id } of bindings.node) {
    const bound = current[field];
    if (bound && !Array.isArray(bound) && bound.id === id) continue;
    await attempt(`${label} (${field})`, async () => target.setBoundVariable(field, await getVariable(id)));
  }

  // Binding typography variables on top of a text style would detach it
  if (target.type === 'TEXT' && !hasTextStyle) {
    for (const { field, id } of bindings.text) {
      const bound = current[field];
      if (Array.isArray(bound) && bound.length === 1 && bound[0].id === id) continue;
      await attempt(`${label} (${field})`, async () => target.setBoundVariable(field, await getVariable(id)));
    }
  }

  if (bindings.fills && 'fills' in target && target.fills !== figma.mixed) {
    const fills = target.fills;
    const ids = bindings.fills;
    await attempt(`${label} (relleno)`, async () => {
      const next = await bindPaintVariables(fills, ids);
      if (next) target.fills = next;
    });
  }

  if (bindings.strokes && 'strokes' in target) {
    const strokes = target.strokes;
    const ids = bindings.strokes;
    await attempt(`${label} (borde)`, async () => {
      const next = await bindPaintVariables(strokes, ids);
      if (next) target.strokes = next;
    });
  }
}

// Recursively apply a snapshot to a target tree
async function applySnapshot(target: SceneNode, snapshot: NodeSnapshot, totalTargetNodes: number) {
  pasteCounter++;

  // Periodically send progress for smoother UI
  if (pasteCounter % 5 === 0) {
    sendProgress(pasteCounter / totalTargetNodes);
  }

  // Properties first: a variant or instance swap can replace the children below
  if (target.type === 'INSTANCE' && snapshot.properties && Object.keys(snapshot.properties).length > 0) {
    const props = snapshot.properties;
    await attempt(`Propiedades de "${target.name}"`, () => target.setProperties(props));
  }

  if (target.type === 'TEXT' && snapshot.textData) {
    await applyText(target, snapshot.textData);
  }

  if (snapshot.layoutData && 'layoutMode' in target) {
    await applyLayout(target, snapshot.layoutData);
  }

  if (snapshot.variables) {
    const hasTextStyle = typeof snapshot.textData?.textStyleId === 'string' && snapshot.textData.textStyleId !== '';
    await applyVariables(target, snapshot.variables, hasTextStyle);
  }

  if ("children" in target && snapshot.children.length > 0) {
    const { pairs, unmatched } = matchChildren(target.children, snapshot.children);
    for (const [child, childSnapshot] of pairs) {
      await applySnapshot(child, childSnapshot, totalTargetNodes);
    }
    for (const missing of unmatched) {
      unmatchedLayers++;
      pasteCounter += countNodes(missing);
    }
  }
}

async function pasteProperties(snapshot: NodeSnapshot) {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    notifyUI("Selecciona destinos.");
    return;
  }

  const instancesToPaste = selection.filter((n): n is InstanceNode => n.type === 'INSTANCE');
  if (instancesToPaste.length === 0) {
    notifyUI("Selecciona instancias válidas.");
    return;
  }

  const totalWork = instancesToPaste.length * totalNodesInSnapshot;
  pasteCounter = 0;
  failures = [];
  unmatchedLayers = 0;
  variableCache.clear();
  const skipped: string[] = [];

  notifyUI("Sincronizando...");
  sendProgress(0, "Sincronizando componentes...");

  for (const node of instancesToPaste) {
    const family = await getComponentFamily(node);
    if (rootFamily && family && family !== rootFamily) {
      skipped.push(node.name);
      pasteCounter += totalNodesInSnapshot;
      continue;
    }
    await applySnapshot(node, snapshot, totalWork);
  }

  sendProgress(1, "Finalizado");

  const warnings = [
    ...skipped.map(name => `"${name}" omitida: es de otro componente`),
    ...failures
  ];
  if (unmatchedLayers > 0) {
    warnings.push(`${unmatchedLayers} capa(s) sin equivalente en el destino`);
  }
  figma.ui.postMessage({ type: 'paste-result', warnings });

  const applied = instancesToPaste.length - skipped.length;
  if (applied === 0) {
    notifyUI("Ninguna instancia es del mismo componente.");
  } else if (warnings.length > 0) {
    notifyUI(`Sincronizado con ${warnings.length} aviso(s).`);
  } else {
    notifyUI(`¡Sincronización completa!`, 3000);
  }
}

// --- Main Message Listener ---

figma.on('selectionchange', () => {
  sendSelectionInfo();
});

sendSelectionInfo();

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'copy-properties') {
    try {
      const selection = figma.currentPage.selection;
      if (selection.length !== 1 || selection[0].type !== 'INSTANCE') {
        notifyUI("Selecciona exactamente una instancia.");
        return;
      }

      notifyUI("Copiando estructura profunda...");
      rootSnapshot = createSnapshot(selection[0]);
      rootFamily = await getComponentFamily(selection[0]);
      totalNodesInSnapshot = countNodes(rootSnapshot);

      // Get names of instances that actually have properties
      const instances = getInstancesWithProps(rootSnapshot);
      // Remove duplicates and keep it clean
      const uniqueInstances = Array.from(new Set(instances));

      notifyUI(`Estructura copiada.`, 3000);

      figma.ui.postMessage({
        type: 'properties-copied',
        instances: uniqueInstances
      });
    } catch (err) {
      console.error(err);
      notifyUI("Error al copiar.");
    } finally {
      figma.ui.postMessage({ type: 'copy-done' });
    }
  }

  if (msg.type === 'paste-properties') {
    try {
      if (!rootSnapshot) {
        notifyUI("No hay datos copiados.");
        return;
      }
      await pasteProperties(rootSnapshot);
    } catch (err) {
      console.error(err);
      notifyUI("Error al pegar.");
    } finally {
      figma.ui.postMessage({ type: 'paste-done' });
    }
  }
};
