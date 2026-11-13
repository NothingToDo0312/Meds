"use client";
import { useRef } from "react";
import { useInstall } from "@/lib/client/install";
import { Download } from "./Icons";

// "Install app" button. Real install prompt where the browser supports it; steps for iPhone/iPad; hidden otherwise.
export default function InstallButton({ className = "btn small", label = "Install app", onDone }) {
  const { available, event, install } = useInstall();
  const steps = useRef(null);
  if (!available) return null;

  async function click() {
    if (event) { const outcome = await install(); onDone?.(outcome); }
    else steps.current?.showModal();
  }

  return (
    <>
      <button type="button" className={className} onClick={click}>
        <Download width={16} height={16} /> {label}
      </button>

      <dialog ref={steps} className="install-steps" onClick={(e) => e.target === steps.current && steps.current.close()}>
        <h2>Install MediReminder</h2>
        <p className="muted">On iPhone and iPad, installing is done from Safari&rsquo;s share menu.</p>
        <ol>
          <li>Open this page in <b>Safari</b>.</li>
          <li>Tap the <b>Share</b> button (the square with an arrow).</li>
          <li>Choose <b>Add to Home Screen</b>, then tap <b>Add</b>.</li>
          <li>Open MediReminder from your Home Screen.</li>
        </ol>
        <div className="actions"><span className="spacer" /><button type="button" className="btn" onClick={() => steps.current.close()}>Got it</button></div>
      </dialog>
    </>
  );
}
