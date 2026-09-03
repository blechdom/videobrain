import { useEffect, useRef } from 'react';
import { ExternalLink, GitFork, Keyboard, X } from 'lucide-react';
import { OPERATOR_DEFINITIONS } from '../graph';
import { DOMAIN_LABELS } from './operatorMeta';

const REPOSITORY_URL = 'https://github.com/blechdom/videobrain';
const ROADMAP_URL = `${REPOSITORY_URL}/blob/main/docs/FUTURE_DEVELOPMENT.md`;

interface HelpDialogProps {
  onClose: () => void;
}

const recipes = [
  {
    title: 'Animated color field',
    path: 'Time → Flow Field → Color Grade → Display',
    note: 'Connect Time to a visual time input, then tune hue and contrast.',
  },
  {
    title: 'Pointer-controlled distortion',
    path: 'Pointer X → Warp Amount; visual source → Warp → Display',
    note: 'Move over the output to modulate distortion directly.',
  },
  {
    title: 'Audio-reactive trails',
    path: 'Audio Level → Trails Feedback; visual source → Trails → Display',
    note: 'Select Audio Level and explicitly enable the microphone when ready.',
  },
  {
    title: 'Live camera dream',
    path: 'Video Input → Warp → Color Grade → Display',
    note: 'Select Video Input, start the camera, then explore fit and mirror modes.',
  },
];

export function HelpDialog({ onClose }: HelpDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const currentGroups = (['control', 'frame', 'display'] as const).map(
    (domain) => ({
      label: DOMAIN_LABELS[domain],
      definitions: OPERATOR_DEFINITIONS.filter(
        (definition) => definition.domain === domain,
      ),
    }),
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
      } else if (document.activeElement === dialogRef.current) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div
      className="modal-backdrop help-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        className="help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        tabIndex={-1}
      >
        <header className="help-header">
          <div>
            <span className="panel-eyebrow">Help &amp; about</span>
            <h1 id="help-title">Build a live signal patch</h1>
            <p>
              Connect control signals to parameters and visual frames to processors,
              ending at a Display node.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close help"
            title="Close help"
          >
            <X size={17} />
          </button>
        </header>

        <nav className="help-jump-links" aria-label="Help sections">
          <a href="#help-start">Quick start</a>
          <a href="#help-concepts">Concepts</a>
          <a href="#help-nodes">Current nodes</a>
          <a href="#help-recipes">Recipes</a>
          <a href="#help-io">I/O</a>
        </nav>

        <div className="help-body">
          <section id="help-start" className="help-section help-callout">
            <span className="help-step">1</span>
            <div>
              <h2>Quick start</h2>
              <ol>
                <li>Press <kbd>/</kbd> or choose <strong>Add node</strong>.</li>
                <li>Drag from an output dot to a matching input dot.</li>
                <li>Select a node to edit it in the inspector.</li>
                <li>End a visual path at <strong>Display</strong> to see it live.</li>
              </ol>
            </div>
          </section>

          <section id="help-concepts" className="help-section">
            <h2>Two signal types, one graph</h2>
            <div className="help-concept-grid">
              <article>
                <i className="help-swatch control" />
                <h3>Control</h3>
                <p>
                  Lightweight numeric values animate speed, color, distortion,
                  feedback, and other parameters.
                </p>
              </article>
              <article>
                <i className="help-swatch frame" />
                <h3>Frame</h3>
                <p>
                  GPU-backed images flow through generators and effects. Frame and
                  control ports intentionally cannot be mixed.
                </p>
              </article>
              <article>
                <i className="help-swatch display" />
                <h3>Output</h3>
                <p>
                  The runtime evaluates only nodes needed by a connected Display,
                  keeping disconnected experiments out of the render path.
                </p>
              </article>
            </div>
          </section>

          <section id="help-nodes" className="help-section">
            <h2>Nodes available now</h2>
            <p className="help-intro">
              This list comes directly from the running node registry, so it stays
              current as the studio grows.
            </p>
            <div className="help-node-groups">
              {currentGroups.map(({ label, definitions }) => (
                <article key={label}>
                  <h3>{label}</h3>
                  <ul>
                    {definitions.map((definition) => (
                      <li key={definition.kind}>
                        <strong>{definition.title}</strong>
                        <span>{definition.summary}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section id="help-recipes" className="help-section">
            <h2>Four patches to try</h2>
            <div className="help-recipe-list">
              {recipes.map((recipe) => (
                <article key={recipe.title}>
                  <h3>{recipe.title}</h3>
                  <code>{recipe.path}</code>
                  <p>{recipe.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="help-io" className="help-section">
            <h2>Inputs, outputs, and device access</h2>
            <p>
              The current release supports pointer input plus opt-in camera and
              microphone access. Browser-native MIDI, gamepad, files, recording,
              and peer streaming are planned. OSC, lighting networks, specialist depth
              sensors, and native video-sharing protocols generally need a small
              local bridge because browsers cannot open arbitrary UDP sockets or
              native texture-sharing handles.
            </p>
            <p className="help-note">
              Camera and microphone access always require a secure page, an explicit
              action, and browser permission. VideoBrain does not upload media unless
              a graph explicitly includes a network output.
            </p>
          </section>

          <section className="help-section help-shortcuts">
            <h2><Keyboard size={15} aria-hidden="true" /> Shortcuts</h2>
            <dl>
              <div><dt>Add/search</dt><dd><kbd>/</kbd></dd></div>
              <div><dt>Play/pause</dt><dd><kbd>Space</kbd></dd></div>
              <div><dt>Undo</dt><dd><kbd>Ctrl/Cmd Z</kbd></dd></div>
              <div><dt>Redo</dt><dd><kbd>Ctrl/Cmd Shift Z</kbd></dd></div>
              <div><dt>Delete selection</dt><dd><kbd>Delete</kbd></dd></div>
              <div><dt>Close a panel</dt><dd><kbd>Esc</kbd></dd></div>
            </dl>
          </section>
        </div>

        <footer className="help-footer">
          <div>
            <strong>VideoBrain</strong>
            <span>Browser-native visual signal studio · proof of concept</span>
          </div>
          <div className="help-footer-links">
            <a href={ROADMAP_URL} target="_blank" rel="noreferrer">
              Full roadmap <ExternalLink size={12} aria-hidden="true" />
            </a>
            <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
              <GitFork size={13} aria-hidden="true" /> Contribute on GitHub
            </a>
          </div>
        </footer>
      </section>
    </div>
  );
}
