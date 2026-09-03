import type {
  GraphParamValue,
  OperatorDefinition,
} from '../graph';
import { formatParameterNumber } from './parameterFormatting';

interface NodeParameterControlsProps {
  nodeId: string;
  definition: OperatorDefinition;
  params: Record<string, GraphParamValue>;
  onParamChange: (
    nodeId: string,
    paramId: string,
    value: GraphParamValue,
  ) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
  onSelect?: () => void;
}

const RANGE_ADJUSTMENT_KEYS = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
]);

export function NodeParameterControls({
  nodeId,
  definition,
  params,
  onParamChange,
  onGestureStart,
  onGestureEnd,
  onSelect,
}: NodeParameterControlsProps) {
  const parameters = Object.entries(definition.params);
  if (parameters.length === 0) {
    return null;
  }

  return (
    <div
      className="node-parameter-list nodrag nopan nowheel"
      role="group"
      aria-label={`${definition.title} parameters`}
    >
      {parameters.map(([paramId, parameter]) => {
        const value = params[paramId] ?? parameter.defaultValue;
        if (parameter.type === 'select') {
          return (
            <label className="node-parameter node-parameter-select" key={paramId}>
              <span>{parameter.label}</span>
              <select
                className="nodrag nopan nowheel"
                value={String(value)}
                aria-label={`${definition.title} ${parameter.label}`}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onSelect?.();
                }}
                onClick={(event) => event.stopPropagation()}
                onFocus={onSelect}
                onChange={(event) => {
                  onParamChange(nodeId, paramId, event.target.value);
                }}
              >
                {parameter.options.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        const numericValue =
          typeof value === 'number' ? value : parameter.defaultValue;
        const progress = Math.min(
          100,
          Math.max(
            0,
            ((numericValue - parameter.min) /
              (parameter.max - parameter.min)) *
              100,
          ),
        );

        return (
          <label className="node-parameter" key={paramId}>
            <span className="node-parameter-heading">
              <span>{parameter.label}</span>
              <output>{formatParameterNumber(numericValue, parameter.step)}</output>
            </span>
            <input
              className="nodrag nopan nowheel"
              type="range"
              min={parameter.min}
              max={parameter.max}
              step={parameter.step}
              value={numericValue}
              aria-label={`${definition.title} ${parameter.label}`}
              style={{ '--range-progress': `${progress}%` } as React.CSSProperties}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelect?.();
                if (event.button === 0) {
                  onGestureStart();
                }
              }}
              onPointerUp={(event) => {
                event.stopPropagation();
                onGestureEnd();
              }}
              onPointerCancel={(event) => {
                event.stopPropagation();
                onGestureEnd();
              }}
              onKeyDown={(event) => {
                if (RANGE_ADJUSTMENT_KEYS.has(event.key)) {
                  onGestureStart();
                }
              }}
              onKeyUp={(event) => {
                if (RANGE_ADJUSTMENT_KEYS.has(event.key)) {
                  onGestureEnd();
                }
              }}
              onBlur={onGestureEnd}
              onFocus={onSelect}
              onChange={(event) => {
                onParamChange(nodeId, paramId, Number(event.target.value));
              }}
            />
          </label>
        );
      })}
    </div>
  );
}
