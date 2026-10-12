/* global document, MediaRecorder, window */
const $ = (id) => document.getElementById(id);
const { narration, selected, token } = await (
  await fetch("/api/config")
).json();
let kind =
    new URLSearchParams(window.location.search).get("mode") === "clone"
      ? "clone"
      : "presentation",
  index = 0,
  recorder,
  stream,
  blob,
  objectUrl,
  tick,
  started,
  pending = false;
const key = () => `${kind}-${String(index + 1).padStart(2, "0")}`;
function view() {
  const rows = narration[kind],
    row = rows[index];
  $("title").textContent = row.title;
  $("position").textContent = `TAKE ${index + 1} OF ${rows.length}`;
  $("script").textContent = row.text;
  $("kind").value = kind;
  $("target").textContent =
    kind === "clone"
      ? "Read at your natural pace for about 30–45 seconds. Keep a consistent distance from the microphone."
      : `Aim for about ${row.targetSeconds} seconds. ${kind === "presentation" ? "Keep the whole presentation between 2 and 3 minutes." : "Keep the full demo under 3 minutes."}`;
  $("slide").src =
    `/slide-${kind === "clone" ? 1 : kind === "presentation" ? index + 1 : Math.min(index + 1, 3)}.png`;
  $("slide").alt =
    kind === "presentation"
      ? `Slide ${index + 1}`
      : "Product reference from the presentation";
  $("progress").textContent =
    `${rows.filter((_, i) => selected[`${kind}-${String(i + 1).padStart(2, "0")}`]).length} of ${rows.length} takes saved`;
  $("recording-help").textContent =
    kind === "clone"
      ? "Record this one sample for your voice clone. Speak naturally in a quiet room, with no music or other speakers."
      : "Find a quiet room. Keep the microphone a hand’s width away. Read once, then speak as if explaining the project to a friend.";
  $("next").hidden = kind === "clone";
  $("segments").replaceChildren(
    ...rows.map((row, i) => {
      const b = document.createElement("button");
      b.textContent = `${selected[`${kind}-${String(i + 1).padStart(2, "0")}`] ? "✓ " : ""}${i + 1}. ${row.title}`;
      b.setAttribute("aria-current", String(i === index));
      b.onclick = () => change(kind, i);
      return b;
    }),
  );
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = undefined;
  }
  blob = undefined;
  $("backup").hidden = true;
  $("save").disabled = true;
  $("timer").textContent = "0:00";
  if (selected[key()]) {
    $("playback").src = `/api/audio/${key()}?t=${Date.now()}`;
    $("status").textContent =
      "Saved take loaded. Listen or record another version.";
  } else {
    $("playback").removeAttribute("src");
    $("playback").load();
    $("status").textContent =
      "The microphone starts only when you choose Record. Listen before saving.";
  }
}
function change(nextKind, nextIndex) {
  if (recorder?.state === "recording" || pending) return;
  if (blob && !window.confirm("This take is not saved. Leave it and switch?")) {
    $("kind").value = kind;
    return;
  }
  kind = nextKind;
  index = nextIndex;
  view();
}
function lock(active) {
  document.body.classList.toggle("recording", active);
  $("kind").disabled = active;
  $("record").disabled = active;
  $("stop").disabled = !active;
  $("next").disabled = active;
  for (const button of $("segments").children) button.disabled = active;
  $("mic").textContent = active ? "Microphone recording" : "Microphone off";
}
$("kind").onchange = (event) => change(event.target.value, 0);
$("next").onclick = () => change(kind, (index + 1) % narration[kind].length);
$("record").onclick = async () => {
  if (blob && !window.confirm("Replace the unsaved take with a new recording?"))
    return;
  pending = true;
  lock(true);
  $("stop").disabled = true;
  $("mic").textContent = "Requesting microphone";
  try {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
      throw new Error("Open this address in Brave, Chrome or Edge to record.");
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    });
    const mimeType = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType)
      throw new Error(
        "This browser cannot record a supported audio format. Try Brave or Chrome.",
      );
    recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      clearInterval(tick);
      lock(false);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      blob = new Blob(chunks, { type: mimeType });
      objectUrl = URL.createObjectURL(blob);
      $("playback").src = objectUrl;
      $("backup").href = objectUrl;
      $("backup").download =
        `${key()}.${mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm"}`;
      $("backup").hidden = false;
      $("save").disabled = false;
      $("status").textContent =
        "Listen to this take. Save it if you like it, or record again.";
    };
    $("playback").pause();
    $("save").disabled = true;
    recorder.start(250);
    started = Date.now();
    tick = setInterval(() => {
      const seconds = Math.floor((Date.now() - started) / 1000);
      $("timer").textContent =
        `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
      if (seconds >= 120 && recorder.state === "recording") recorder.stop();
    }, 250);
    $("stop").disabled = false;
    $("mic").textContent = "Microphone recording";
    $("status").textContent =
      "Recording your voice. Choose Stop when this section is done.";
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    lock(false);
    $("status").textContent = `Recording could not start: ${error.message}`;
  } finally {
    pending = false;
  }
};
$("stop").onclick = () => {
  if (recorder?.state === "recording") {
    $("stop").disabled = true;
    recorder.stop();
  }
};
$("save").onclick = async () => {
  if (!blob) return;
  pending = true;
  $("save").disabled = true;
  $("next").disabled = true;
  $("kind").disabled = true;
  $("record").disabled = true;
  try {
    const response = await fetch(`/api/takes/${kind}/${index + 1}`, {
      method: "POST",
      headers: { "Content-Type": blob.type, "X-Studio-Token": token },
      body: blob,
    });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    selected[result.key] = result.selected;
    blob = undefined;
    view();
    $("status").textContent =
      kind === "clone"
        ? "Sample saved on this computer. Tell me it is ready so we can create and test your voice clone."
        : "Saved on this computer. You can move to the next take.";
  } catch (error) {
    $("status").textContent =
      `Save failed: ${error.message}. Download a copy or try Save again.`;
    $("save").disabled = false;
  } finally {
    pending = false;
    $("next").disabled = false;
    $("kind").disabled = false;
    $("record").disabled = false;
  }
};
window.addEventListener("beforeunload", (event) => {
  if (blob || recorder?.state === "recording") {
    event.preventDefault();
    event.returnValue = "";
  }
});
view();
