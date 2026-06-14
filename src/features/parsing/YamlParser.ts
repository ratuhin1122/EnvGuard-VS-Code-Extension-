import {
  Document,
  LineCounter,
  Node,
  Pair,
  isAlias,
  isMap,
  isScalar,
  isSeq,
  parseAllDocuments,
} from 'yaml';
import { EnvEntry, EnvFileFormat } from '../../models';
import { IEnvParser } from '../../types';

/**
 * Matches Spring Boot-style YAML config files: `application.yml`,
 * `application.yaml`, and profile variants like `application-dev.yml`.
 * Deliberately does NOT match arbitrary YAML (docker-compose.yml, CI
 * configs, …) to avoid flooding the tree with non-environment files.
 */
const FILE_PATTERN = /^application(-[\w.]+)?\.ya?ml$/i;

/**
 * Parses YAML configuration files into flat entries.
 *
 * Nested maps are flattened with dots (`spring.datasource.url`) and
 * sequences with indices (`servers[0]`), so YAML configs become directly
 * comparable against flat dotenv/properties files. Multi-document files
 * (Spring's `---` profile sections) are merged into one entry list.
 */
export class YamlParser implements IEnvParser {
  public readonly format: EnvFileFormat = 'yaml';

  public supports(fileName: string): boolean {
    return FILE_PATTERN.test(fileName);
  }

  public parse(content: string, filePath: string): EnvEntry[] {
    const entries: EnvEntry[] = [];
    const lineCounter = new LineCounter();
    const documents = parseAllDocuments(content, { lineCounter });

    for (const doc of documents) {
      if (doc.contents) {
        this.walk(doc.contents as Node, '', doc, lineCounter, filePath, entries);
      }
    }

    return entries;
  }

  private walk(
    node: Node,
    prefix: string,
    doc: Document,
    lineCounter: LineCounter,
    filePath: string,
    entries: EnvEntry[],
  ): void {
    if (isAlias(node)) {
      const resolved = node.resolve(doc);
      if (resolved) {
        this.walk(resolved as Node, prefix, doc, lineCounter, filePath, entries);
      }
      return;
    }

    if (isMap(node)) {
      for (const pair of node.items as Pair[]) {
        const keyText = isScalar(pair.key) ? String(pair.key.value) : String(pair.key);
        const childPrefix = prefix === '' ? keyText : `${prefix}.${keyText}`;
        if (pair.value) {
          this.walk(pair.value as Node, childPrefix, doc, lineCounter, filePath, entries);
        } else {
          entries.push({ key: childPrefix, value: '', file: filePath });
        }
      }
      return;
    }

    if (isSeq(node)) {
      node.items.forEach((item, index) => {
        if (item) {
          this.walk(item as Node, `${prefix}[${index}]`, doc, lineCounter, filePath, entries);
        }
      });
      return;
    }

    if (isScalar(node)) {
      const line =
        node.range !== undefined && node.range !== null
          ? lineCounter.linePos(node.range[0]).line
          : undefined;
      entries.push({
        key: prefix,
        value: node.value === null || node.value === undefined ? '' : String(node.value),
        file: filePath,
        line,
      });
    }
  }
}
