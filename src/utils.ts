import { SavedMeeting, TranscriptEntry, SummaryData } from "./types";

// Text to Speech playback with custom voice selection if available
export const speakText = (text: string, langSpeechCode: string) => {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("Speech Synthesis is not supported in this browser.");
    return;
  }

  // Cancel any active utterance
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langSpeechCode;

  // Try to find a matches-voice
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(
    (voice) =>
      voice.lang.toLowerCase().startsWith(langSpeechCode.toLowerCase()) ||
      voice.lang.toLowerCase().includes(langSpeechCode.split("-")[0].toLowerCase())
  );

  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
};

// Exponent word document exporter
export const exportToWord = (meeting: SavedMeeting) => {
  const { title, date, duration, languages, transcript, summaryData } = meeting;

  const summarySection = summaryData
    ? `
    <h2>1. Executive Summary</h2>
    <p>${summaryData.summary}</p>
    
    <h2>2. Key Topics Discussed</h2>
    <ul>
      ${summaryData.topics.map(t => `<li><strong>${t.title}</strong>: ${t.details}</li>`).join("")}
    </ul>
    
    <h2>3. Action Items Plan</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 70%;">Action Description</th>
          <th style="width: 30%;">Assignee / Owner</th>
        </tr>
      </thead>
      <tbody>
        ${summaryData.actionItems.map(a => `<tr><td>${a.description}</td><td>${a.owner || "Unassigned"}</td></tr>`).join("")}
      </tbody>
    </table>
    
    <h2>4. Key Decisions</h2>
    <ol>
      ${summaryData.decisions.map(d => `<li>${d}</li>`).join("")}
    </ol>
  `
    : `<p><em>No automated meeting summary generated yet.</em></p>`;

  const transcriptRows = transcript
    .map(
      (t) => `
    <tr>
      <td style="color:#666; font-size:11px;">${t.time}</td>
      <td><strong>${t.user}</strong> (${t.lang})</td>
      <td>
        <p style="margin:2px 0;"><strong>Original:</strong> ${t.text}</p>
        <p style="margin:2px 0; color:#2563eb;"><strong>Translation:</strong> ${t.translation}</p>
      </td>
    </tr>
  `
    )
    .join("");

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; padding: 40px; }
        h1 { color: #1e3a8a; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; font-size: 26px; }
        h2 { color: #1d4ed8; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px; margin-top: 30px; font-size: 18px; }
        .meta-info { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin-bottom: 24px; }
        .meta-grid { display: table; width: 100%; }
        .meta-row { display: table-row; }
        .meta-cell { display: table-cell; padding: 4px 10px; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
        th { background-color: #f1f5f9; font-weight: bold; color: #334155; }
        ul, ol { padding-left: 20px; }
        li { margin-bottom: 6px; }
      </style>
    </head>
    <body>
      <h1>Meeting Record: ${title}</h1>
      
      <div class="meta-info">
        <div class="meta-grid">
          <div class="meta-row">
            <div class="meta-cell"><strong>Date:</strong></div>
            <div class="meta-cell">${date}</div>
          </div>
          <div class="meta-row">
            <div class="meta-cell"><strong>Duration:</strong></div>
            <div class="meta-cell">${duration}</div>
          </div>
          <div class="meta-row">
            <div class="meta-cell"><strong>Languages Synced:</strong></div>
            <div class="meta-cell">${languages.join(", ")}</div>
          </div>
        </div>
      </div>
      
      ${summarySection}
      
      <h2>5. Bilingual Conversation Transcript</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 12%;">Time</th>
            <th style="width: 25%;">Speaker</th>
            <th style="width: 63%;">Bilingual Speeches</th>
          </tr>
        </thead>
        <tbody>
          ${transcriptRows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + wordHtml], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}_Meeting_Notes.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Formatted print/PDF generator
export const exportToPDF = (meeting: SavedMeeting) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup blocked! Please allow popups to export PDF.");
    return;
  }

  const { title, date, duration, languages, transcript, summaryData, whiteboardDataUrl } = meeting;

  const summaryHtml = summaryData
    ? `
    <div class="section">
      <h2>1. Executive Summary</h2>
      <p style="text-align: justify;">${summaryData.summary}</p>
    </div>
    
    <div class="section">
      <h2>2. Key Discussion Topics</h2>
      <div class="topics-grid">
        ${summaryData.topics.map(t => `
          <div class="topic-item">
            <strong>${t.title}</strong>
            <p>${t.details}</p>
          </div>
        `).join("")}
      </div>
    </div>
    
    <div class="section">
      <h2>3. Action Items</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 70%;">Task Description</th>
            <th style="width: 30%;">Assignee</th>
          </tr>
        </thead>
        <tbody>
          ${summaryData.actionItems.map(a => `
            <tr>
              <td>${a.description}</td>
              <td><span class="badge">${a.owner || "Unassigned"}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    
    <div class="section">
      <h2>4. Strategic Decisions</h2>
      <ul>
        ${summaryData.decisions.map(d => `<li>${d}</li>`).join("")}
      </ul>
    </div>
  `
    : `
    <div class="section">
      <p style="color: #666; font-style: italic;">No automated meeting summary generated yet.</p>
    </div>
  `;

  const transcriptRows = transcript.map(t => `
    <tr>
      <td class="timestamp">${t.time}</td>
      <td><strong>${t.user}</strong><br><span style="font-size: 10px; color:#666;">${t.lang}</span></td>
      <td>
        <p style="margin: 0 0 4px 0;"><strong>Original:</strong> ${t.text}</p>
        <p style="margin: 0; color: #1d4ed8;"><strong>Translation:</strong> ${t.translation}</p>
      </td>
    </tr>
  `).join("");

  const whiteboardHtml = whiteboardDataUrl
    ? `
    <div class="section page-break">
      <h2>5. Whiteboard Conceptual Layout</h2>
      <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; text-align: center; background:#fff;">
        <img src="${whiteboardDataUrl}" style="max-width: 100%; max-height: 400px; object-fit: contain;" />
      </div>
    </div>
    `
    : "";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} - Report</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
          color: #1f2937;
          line-height: 1.5;
          margin: 40px;
          background-color: #fff;
        }
        .header {
          border-bottom: 3px solid #1e3a8a;
          padding-bottom: 16px;
          margin-bottom: 30px;
        }
        h1 {
          font-size: 28px;
          color: #1e3a8a;
          margin: 0 0 8px 0;
          font-weight: 700;
        }
        h2 {
          font-size: 18px;
          color: #1d4ed8;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 6px;
          margin-top: 0;
          margin-bottom: 14px;
          font-weight: 600;
        }
        .meta-info {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 30px;
        }
        .meta-item span {
          display: block;
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .meta-item strong {
          font-size: 14px;
          color: #334155;
        }
        .section {
          margin-bottom: 30px;
        }
        .topic-item {
          background-color: #fafafa;
          border-left: 4px solid #3b82f6;
          padding: 12px;
          margin-bottom: 12px;
          border-radius: 0 6px 6px 0;
        }
        .topic-item strong {
          display: block;
          font-size: 15px;
          color: #1e40af;
          margin-bottom: 4px;
        }
        .topic-item p {
          margin: 0;
          font-size: 13px;
          color: #4b5563;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 12px;
          text-align: left;
          font-size: 13px;
        }
        th {
          background-color: #faf5f5;
          font-weight: 600;
          color: #475569;
        }
        .timestamp {
          color: #64748b;
          font-family: monospace;
          font-size: 12px;
          white-space: nowrap;
        }
        .badge {
          background-color: #eff6ff;
          color: #1d4ed8;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        li {
          font-size: 13px;
          margin-bottom: 8px;
        }
        .page-break {
          page-break-before: always;
        }
        @media print {
          body { margin: 20px; }
          .page-break { page-break-before: always; }
          button { display: none; }
        }
      </style>
    </head>
    <body onload="window.print();">
      <div class="header">
        <h1>Meeting Executive Minutes</h1>
        <p style="margin: 0; color: #64748b; font-size: 14px;">Bilingual Speech Translation & Strategic Alignment Report</p>
      </div>
      
      <div class="meta-info">
        <div class="meta-item">
          <span>Meeting Topic / Title</span>
          <strong>${title}</strong>
        </div>
        <div class="meta-item">
          <span>Date Conducted</span>
          <strong>${date}</strong>
        </div>
        <div class="meta-item">
          <span>Environment & Synced</span>
          <strong>${languages.join(" - ")} (${duration})</strong>
        </div>
      </div>
      
      ${summaryHtml}
      ${whiteboardHtml}
      
      <div class="section page-break">
        <h2>Bilingual Chat Transcript logs</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 10%;">Time</th>
              <th style="width: 20%;">Speaker</th>
              <th style="width: 70%;">Bilingual Discussion Log</th>
            </tr>
          </thead>
          <tbody>
            ${transcriptRows}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
};

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
