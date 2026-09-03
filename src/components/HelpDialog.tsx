import { useEffect, useRef } from 'react';
import { ExternalLink, GitFork, Keyboard, X } from 'lucide-react';
import { GRAPH_PRESETS, OPERATOR_DEFINITIONS } from '../graph';
import { DOMAIN_LABELS } from './operatorMeta';

const REPOSITORY_URL = 'https://github.com/blechdom/videobrain';
const ROADMAP_URL = `${REPOSITORY_URL}/blob/main/docs/FUTURE_DEVELOPMENT.md`;
const MODEL_CONNECTORS_URL = `${REPOSITORY_URL}/blob/main/docs/MODEL_CONNECTORS.md`;
const COMPONENT_CATALOG_URL = 'https://videobrain.org/storybook/';

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
    note: 'Move over the output to modulate distortion. Held, Press, and Release support button-driven variations.',
  },
  {
    title: 'Beat-locked motion',
    path: 'Transport Time → Beat Clock → Oscillator Phase → Warp Amount',
    note: 'Set BPM and beats per bar, then use phase, beat pulse, or bar phase to drive a visual.',
  },
  {
    title: 'Two-axis color control',
    path: 'XY Pad X → Color Grade Hue; XY Pad Y → Color Grade Exposure',
    note: 'Drag inside the XY Pad node to shape two visual values at once.',
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
  {
    title: 'Model connector preview',
    path: 'AI Chat → Video Model Prompt; visual source → Video Model → Display',
    note: 'Preview is a built-in visual effect that does not interpret the prompt. Local/API adapters consume the text.',
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
            <h1 id="help-title">Explore the Signal Graph</h1>
            <p>
              Connect controls to parameters, text to model-aware nodes, and
              visual frames to processors, ending at Display.
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
          <a href="#help-starters">Starters</a>
          <a href="#help-concepts">Concepts</a>
          <a href="#help-nodes">Current nodes</a>
          <a href="#help-recipes">Recipes</a>
          <a href="#help-models">Models</a>
          <a href="#help-io">I/O</a>
        </nav>

        <div className="help-body">
          <section id="help-start" className="help-section help-callout">
            <span className="help-step">1</span>
            <div>
              <h2>Quick start</h2>
              <ol>
                <li>
                  Open <strong>New patch</strong> to choose a starter, or begin
                  with a blank canvas.
                </li>
                <li>Press <kbd>/</kbd> or choose <strong>Add node</strong>.</li>
                <li>Drag from an output dot to a matching input dot.</li>
                <li>
                  Tune every editable value directly inside its node. Select the
                  node when you also want its spacious Inspector.
                </li>
                <li>
                  Drag inside <strong>XY Pad</strong> to change its X and Y outputs
                  together.
                </li>
                <li>End a visual path at <strong>Display</strong> to see it live.</li>
              </ol>
            </div>
          </section>

          <section id="help-starters" className="help-section">
            <h2>Starter patches</h2>
            <p className="help-intro">
              The New patch menu replaces the current graph with one of these
              examples. The replacement is undoable. Blank Canvas contains no
              nodes; every other starter has a complete path to Display.
            </p>
            <div className="help-recipe-list">
              {GRAPH_PRESETS.map((preset) => (
                <article key={preset.id}>
                  <h3>{preset.title}</h3>
                  <p>{preset.description}</p>
                </article>
              ))}
            </div>
            <p className="help-note">
              Starting any new patch stops active camera and microphone
              sessions, closes model connections, and clears session-only
              model keys. Device-based starters still use their safe fallback
              until you select the input node and explicitly enable access.
            </p>
          </section>

          <section id="help-concepts" className="help-section">
            <h2>Three signal types, one graph</h2>
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
                <i className="help-swatch text" />
                <h3>Text</h3>
                <p>
                  Bounded UTF-8 text carries prompts today and can grow into
                  formatting, labels, and structured text workflows later.
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
            <h2>Seven patches to try</h2>
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

          <section id="help-models" className="help-section">
            <h2>AI Chat and Video Model</h2>
            <p>
              AI Chat emits a typed prompt. A Local/API Video Model adapter
              consumes that prompt and produces a frame. The default Preview
              runtime is a built-in procedural GPU effect: it can transform an
              optional visual source, but it does not interpret prompt text,
              perform model inference, or leave this tab.
            </p>
            <p>
              Local and API runtimes connect only to a trusted, user-run endpoint
              implementing <code>videobrain.frames.v1</code>. Most existing model
              services need a small adapter or gateway; entering an arbitrary
              vendor URL does not make it compatible. HTTP supports one-shot
              generated images, while WebSocket supports streamed responses and
              an explicitly connected live camera source. Other upstream visuals
              affect Preview locally but are not uploaded in this release. Keep
              the model on a path ending at Display to enable network work.
            </p>
            <p className="help-note">
              Endpoint URLs and prompts are saved with the graph. API keys stay
              only in memory for this tab. Camera pixels are sent only when Video
              Input is live, connected directly to Video Model, and its compatible
              WebSocket is open. API mode and session keys require HTTPS/WSS;
              plain transport is limited to a credential-free Local loopback
              adapter. The hosted HTTPS app rejects plaintext WebSocket and
              HTTP model endpoints.
            </p>
            <p>
              <a href={MODEL_CONNECTORS_URL} target="_blank" rel="noreferrer">
                Read the model adapter protocol <ExternalLink size={12} aria-hidden="true" />
              </a>
            </p>
          </section>

          <section id="help-io" className="help-section">
            <h2>Inputs, outputs, and device access</h2>
            <p>
              The current release supports transport and beat timing, the built-in
              XY pad, pointer position/held/press/release, AI prompt text, a
              compatible model adapter, and opt-in camera and microphone access.
              Browser-native MIDI,
              gamepad, files, recording, and peer streaming are planned. OSC,
              lighting networks, specialist depth sensors, and native video-sharing
              protocols generally need a small local bridge because browsers cannot
              open arbitrary UDP sockets or native texture-sharing handles.
            </p>
            <p className="help-note">
              Camera and microphone access always require a secure page, an explicit
              action, and browser permission. Camera media stays local unless it
              is directly routed into an explicitly connected networked Video Model.
            </p>
            <p className="help-note">
              <strong>Monitor pacing:</strong> Display sync follows the browser's
              display refresh. The 60 fps and 30 fps choices cap rendering on
              the same synchronized animation clock, and the readout reports a
              rolling measured render rate.
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
            <a href={COMPONENT_CATALOG_URL} target="_blank" rel="noreferrer">
              Component catalog <ExternalLink size={12} aria-hidden="true" />
            </a>
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
