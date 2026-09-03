import { useMemo, useState } from 'react';
import { Blocks, Search } from 'lucide-react';
import {
  OPERATOR_DEFINITIONS,
  type NodeKind,
  type OperatorDefinition,
  type OperatorDomain,
} from '../graph';
import { DOMAIN_LABELS, OPERATOR_META } from './operatorMeta';

interface OperatorLibraryProps {
  onAdd: (kind: NodeKind) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}
const DOMAIN_ORDER: readonly OperatorDomain[] = ['control', 'frame', 'display'];

export function OperatorLibrary({ onAdd, searchInputRef }: OperatorLibraryProps) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const visible = normalized
      ? OPERATOR_DEFINITIONS.filter((definition) =>
          `${definition.title} ${definition.summary} ${definition.kind}`
            .toLowerCase()
            .includes(normalized),
        )
      : OPERATOR_DEFINITIONS;

    return DOMAIN_ORDER.map((domain) => ({
      domain,
      definitions: visible.filter((definition) => definition.domain === domain),
    })).filter((group) => group.definitions.length > 0);
  }, [query]);

  return (
    <aside className="operator-library" aria-label="Node library">
      <div className="panel-heading">
        <div>
          <div className="panel-eyebrow">Library</div>
          <h2 className="panel-title">Add a node</h2>
        </div>
        <Blocks size={16} aria-hidden="true" />
      </div>
      <label className="search-field">
        <Search aria-hidden="true" />
        <span className="sr-only">Search nodes</span>
        <input
          ref={searchInputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search nodes"
          autoComplete="off"
        />
        <span className="search-key">/</span>
      </label>
      <div className="operator-groups">
        {groups.map(({ domain, definitions }) => (
          <section className="operator-group" key={domain}>
            <h3 className="operator-group-title">
              <span>{DOMAIN_LABELS[domain]}</span>
            </h3>
            {definitions.map((definition) => (
              <OperatorTile key={definition.kind} definition={definition} onAdd={onAdd} />
            ))}
          </section>
        ))}
        {groups.length === 0 ? (
          <p className="empty-filter">No nodes match “{query}”. Try a signal, visual, or output.</p>
        ) : null}
      </div>
      <div className="library-footnote">Click a node to place it near the center of the patch.</div>
    </aside>
  );
}

function OperatorTile({
  definition,
  onAdd,
}: {
  definition: OperatorDefinition;
  onAdd: (kind: NodeKind) => void;
}) {
  const meta = OPERATOR_META[definition.kind];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      className="operator-tile"
      style={{ '--node-accent': meta.accent } as React.CSSProperties}
      onClick={() => onAdd(definition.kind)}
      title={`Add ${definition.title}`}
    >
      <span className="operator-icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="operator-copy">
        <span className="operator-name">{definition.title}</span>
        <span className="operator-description">{definition.summary}</span>
      </span>
      <span className="operator-add" aria-hidden="true">+</span>
    </button>
  );
}
