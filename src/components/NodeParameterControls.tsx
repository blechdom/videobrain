import { useRef } from 'react';
import type { GraphParamValue, OperatorDefinition } from '../graph';
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

const XY_ADJUSTMENT_KEYS = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snapToStep(value: number, min: number, max: number, step: number): number {
  const snapped = min + Math.round((value - min) / step) * step;
  return Number(clamp(snapped, min, max).toFixed(10));
}

export function NodeParameterControls({
  nodeId,
  definition,
  params,
  onParamChange,
  onGestureStart,
  onGestureEnd,
  onSelect,
}: NodeParameterControlsProps) {
  const activePointerId = useRef<number | null>(null);
  const activeKeys = useRef(new Set<string>());
  const parameters = Object.entries(definition.params);
  if (parameters.length === 0) {
    return null;
  }

  const xyLayout = definition.parameterLayout;
  const xParameter = xyLayout
    ? definition.params[xyLayout.xParamId]
    : undefined;
  const yParameter = xyLayout
    ? definition.params[xyLayout.yParamId]
    : undefined;
  const hasXYLayout =
    xyLayout?.type === 'xy' &&
    xParameter?.type === 'number' &&
    yParameter?.type === 'number';

  const renderXYPad = () => {
    if (!hasXYLayout) {
      return null;
    }

    const storedX = params[xyLayout.xParamId];
    const storedY = params[xyLayout.yParamId];
    const xValue =
      typeof storedX === 'number' ? storedX : xParameter.defaultValue;
    const yValue =
      typeof storedY === 'number' ? storedY : yParameter.defaultValue;
    const normalizedX =
      (xValue - xParameter.min) / (xParameter.max - xParameter.min);
    const normalizedY =
      (yValue - yParameter.min) / (yParameter.max - yParameter.min);
    const helpId = `${nodeId}-xy-help`;
    const valueId = `${nodeId}-xy-value`;

    const updateFromPoint = (
      clientX: number,
      clientY: number,
      surface: HTMLButtonElement,
    ) => {
      const bounds = surface.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) {
        return;
      }
      const nextX = snapToStep(
        xParameter.min +
          clamp((clientX - bounds.left) / bounds.width, 0, 1) *
            (xParameter.max - xParameter.min),
        xParameter.min,
        xParameter.max,
        xParameter.step,
      );
      const nextY = snapToStep(
        yParameter.min +
          (1 - clamp((clientY - bounds.top) / bounds.height, 0, 1)) *
            (yParameter.max - yParameter.min),
        yParameter.min,
        yParameter.max,
        yParameter.step,
      );
      onParamChange(nodeId, xyLayout.xParamId, nextX);
      onParamChange(nodeId, xyLayout.yParamId, nextY);
    };

    const endPointerGesture = (pointerId: number) => {
      if (activePointerId.current !== pointerId) {
        return;
      }
      activePointerId.current = null;
      onGestureEnd();
    };

    const updateFromKey = (key: string, coarse: boolean) => {
      const xStep = xParameter.step * (coarse ? 10 : 1);
      const yStep = yParameter.step * (coarse ? 10 : 1);
      let nextX = xValue;
      let nextY = yValue;
      switch (key) {
        case 'ArrowLeft':
          nextX -= xStep;
          break;
        case 'ArrowRight':
          nextX += xStep;
          break;
        case 'ArrowDown':
          nextY -= yStep;
          break;
        case 'ArrowUp':
          nextY += yStep;
          break;
        case 'Home':
          nextX = xParameter.min;
          nextY = yParameter.min;
          break;
        case 'End':
          nextX = xParameter.max;
          nextY = yParameter.max;
          break;
      }
      onParamChange(
        nodeId,
        xyLayout.xParamId,
        snapToStep(nextX, xParameter.min, xParameter.max, xParameter.step),
      );
      onParamChange(
        nodeId,
        xyLayout.yParamId,
        snapToStep(nextY, yParameter.min, yParameter.max, yParameter.step),
      );
    };

    return (
      <div className="node-xy-control">
        <div className="node-xy-heading">
          <span>{xyLayout.label}</span>
          <output id={valueId} aria-live="polite">
            X {formatParameterNumber(xValue, xParameter.step)} · Y{' '}
            {formatParameterNumber(yValue, yParameter.step)}
          </output>
        </div>
        <button
          type="button"
          className="node-xy-pad nodrag nopan nowheel"
          aria-label={`${definition.title} ${xyLayout.label}`}
          aria-describedby={`${valueId} ${helpId}`}
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home End"
          style={
            {
              '--xy-x': `${clamp(normalizedX, 0, 1) * 100}%`,
              '--xy-y': `${(1 - clamp(normalizedY, 0, 1)) * 100}%`,
            } as React.CSSProperties
          }
          onFocus={onSelect}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => {
            event.stopPropagation();
            if (event.button !== 0) {
              return;
            }
            event.preventDefault();
            onSelect?.();
            event.currentTarget.focus();
            activePointerId.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            onGestureStart();
            updateFromPoint(event.clientX, event.clientY, event.currentTarget);
          }}
          onPointerMove={(event) => {
            if (activePointerId.current !== event.pointerId) {
              return;
            }
            event.stopPropagation();
            event.preventDefault();
            updateFromPoint(event.clientX, event.clientY, event.currentTarget);
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            if (activePointerId.current !== event.pointerId) {
              return;
            }
            updateFromPoint(event.clientX, event.clientY, event.currentTarget);
            endPointerGesture(event.pointerId);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={(event) => {
            event.stopPropagation();
            endPointerGesture(event.pointerId);
          }}
          onLostPointerCapture={(event) => endPointerGesture(event.pointerId)}
          onKeyDown={(event) => {
            if (!XY_ADJUSTMENT_KEYS.has(event.key)) {
              return;
            }
            event.stopPropagation();
            event.preventDefault();
            if (!event.repeat && activeKeys.current.size === 0) {
              onGestureStart();
            }
            activeKeys.current.add(event.key);
            updateFromKey(event.key, event.shiftKey);
          }}
          onKeyUp={(event) => {
            if (XY_ADJUSTMENT_KEYS.has(event.key)) {
              event.stopPropagation();
              activeKeys.current.delete(event.key);
              if (activeKeys.current.size === 0) {
                onGestureEnd();
              }
            }
          }}
          onBlur={() => {
            if (activeKeys.current.size > 0) {
              activeKeys.current.clear();
              onGestureEnd();
            }
          }}
        >
          <span className="node-xy-crosshair node-xy-crosshair-x" />
          <span className="node-xy-crosshair node-xy-crosshair-y" />
          <span className="node-xy-thumb" />
        </button>
        <span className="sr-only" id={helpId}>
          Drag to set X and Y. Use arrow keys for fine changes or Shift plus an
          arrow key for coarse changes.
        </span>
      </div>
    );
  };

  return (
    <div
      className="node-parameter-list nodrag nopan nowheel"
      role="group"
      aria-label={`${definition.title} parameters`}
    >
      {renderXYPad()}
      {parameters.map(([paramId, parameter]) => {
        const value = params[paramId] ?? parameter.defaultValue;
        if (parameter.type === 'text') {
          const textValue =
            typeof value === 'string' ? value : parameter.defaultValue;
          const commonProps = {
            className: 'nodrag nopan nowheel',
            value: textValue,
            maxLength: parameter.maxLength,
            placeholder: parameter.placeholder,
            'aria-label': `${definition.title} ${parameter.label}`,
            onPointerDown: (event: React.PointerEvent) => {
              event.stopPropagation();
              onSelect?.();
            },
            onClick: (event: React.MouseEvent) => event.stopPropagation(),
            onKeyDown: (event: React.KeyboardEvent) => event.stopPropagation(),
            onFocus: () => {
              onSelect?.();
              onGestureStart();
            },
            onBlur: onGestureEnd,
            onChange: (
              event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => onParamChange(nodeId, paramId, event.target.value),
          };

          return (
            <label className="node-parameter node-parameter-text" key={paramId}>
              <span className="node-parameter-label">{parameter.label}</span>
              {parameter.multiline ? (
                <textarea {...commonProps} rows={4} />
              ) : (
                <input {...commonProps} type="text" />
              )}
              <output>{textValue.length}/{parameter.maxLength}</output>
            </label>
          );
        }
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
          <label className="node-parameter node-parameter-number" key={paramId}>
            <span className="node-parameter-label">{parameter.label}</span>
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
            <output>{formatParameterNumber(numericValue, parameter.step)}</output>
          </label>
        );
      })}
    </div>
  );
}
