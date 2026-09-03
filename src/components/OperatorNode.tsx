import { memo } from 'react';
import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  getOperatorDefinition,
  type GraphParamValue,
  type NodeKind,
} from '../graph';
import { DOMAIN_LABELS, OPERATOR_META } from './operatorMeta';

export interface OperatorNodeData extends Record<string, unknown> {
  kind: NodeKind;
  params: Record<string, GraphParamValue>;
  reachable: boolean;
}

export type OperatorFlowNode = Node<OperatorNodeData, 'operator'>;

function summarizeParams(params: Record<string, GraphParamValue>): string {
  const entry = Object.entries(params)[0];
  if (!entry) {
    return 'ready';
  }
  const [key, value] = entry;
  const shown = typeof value === 'number' ? value.toFixed(2) : String(value);
  return `${key} ${shown}`;
}

function OperatorNodeView({ data, selected, isConnectable }: NodeProps<OperatorFlowNode>) {
  const definition = getOperatorDefinition(data.kind);
  const meta = OPERATOR_META[data.kind];
  const Icon = meta.icon;
  const className = [
    'operator-node',
    selected ? 'selected' : '',
    data.reachable ? '' : 'unreachable',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={className}
      style={{ '--node-accent': meta.accent } as React.CSSProperties}
      aria-label={`${definition.title} node`}
    >
      <header className="operator-node-header">
        <span className="node-kind-icon" aria-hidden="true">
          <Icon />
        </span>
        <span>
          <span className="node-title">{definition.title}</span>
          <span className="node-family">{DOMAIN_LABELS[definition.domain]}</span>
        </span>
        <span className="node-status" aria-label={data.reachable ? 'Active' : 'Idle'} />
      </header>

      <div className="node-ports">
        <div className="port-column inputs">
          {definition.inputs.map((input) => (
            <div className="port-row" key={input.id}>
              <Handle
                id={input.id}
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                className={`vb-handle ${input.type.replace('.', '-')}`}
                aria-label={`${input.label} input, ${input.type}`}
              />
              {input.label}
            </div>
          ))}
        </div>
        <div className="port-column outputs">
          {definition.outputs.map((output) => (
            <div className="port-row" key={output.id}>
              {output.label}
              <Handle
                id={output.id}
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                className={`vb-handle ${output.type.replace('.', '-')}`}
                aria-label={`${output.label} output, ${output.type}`}
              />
            </div>
          ))}
        </div>
      </div>

      <footer className="node-param-summary">
        <span>{definition.kind}</span>
        <strong>{summarizeParams(data.params)}</strong>
      </footer>
    </article>
  );
}

export const OperatorNode = memo(OperatorNodeView);
