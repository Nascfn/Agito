import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILE_BYTES,
  checkFile,
  describeUploadFailures,
  formatFileSize,
  isPreviewable,
} from "../src/lib/attachments/rules.ts";

describe("checkFile", () => {
  it("allows the decided types and derives the type from the extension", () => {
    assert.deepEqual(checkFile("Report.PDF", 100), {
      ok: true,
      data: { extension: "pdf", mimeType: "application/pdf" },
    });
    const cases: [string, string][] = [
      ["photo.jpeg", "image/jpeg"],
      ["photo.jpg", "image/jpeg"],
      ["iphone.heic", "image/heic"],
      ["notes.md", "text/markdown"],
      ["data.csv", "text/csv"],
      ["brief.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      ["budget.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      ["deck.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    ];
    for (const [name, mimeType] of cases) {
      const result = checkFile(name, 100);
      assert.equal(result.ok && result.data.mimeType, mimeType, name);
    }
  });

  it("blocks everything else, including disguised files", () => {
    for (const name of [
      "page.html",
      "logo.svg",
      "archive.zip",
      "setup.exe",
      "script.js",
      "report.pdf.exe",
      "old.doc",
      "macro.docm",
      "no-extension",
    ]) {
      assert.equal(checkFile(name, 100).ok, false, name);
    }
  });

  it("enforces size limits", () => {
    assert.equal(checkFile("a.pdf", 0).ok, false);
    assert.equal(checkFile("a.pdf", MAX_FILE_BYTES).ok, true);
    assert.equal(checkFile("a.pdf", MAX_FILE_BYTES + 1).ok, false);
    assert.equal(checkFile("a.pdf", 1.5).ok, false);
  });

  it("limits file name length", () => {
    assert.equal(checkFile(`${"a".repeat(251)}.pdf`, 100).ok, true);
    assert.equal(checkFile(`${"a".repeat(252)}.pdf`, 100).ok, false);
  });
});

describe("isPreviewable", () => {
  it("opens safe types in the browser and downloads the rest", () => {
    assert.equal(isPreviewable("application/pdf"), true);
    assert.equal(isPreviewable("image/png"), true);
    assert.equal(isPreviewable("image/heic"), false);
    assert.equal(
      isPreviewable("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      false,
    );
  });
});

describe("describeUploadFailures", () => {
  it("summarizes failed uploads", () => {
    assert.equal(describeUploadFailures([]), null);
    assert.equal(describeUploadFailures(["Couldn't upload a.pdf. Try again."]), "Couldn't upload a.pdf. Try again.");
    assert.equal(describeUploadFailures(["x", "y", "z"]), "3 files couldn't be uploaded. Try again.");
  });
});

describe("formatFileSize", () => {
  it("uses B, KB, and MB", () => {
    assert.equal(formatFileSize(500), "500 B");
    assert.equal(formatFileSize(2048), "2 KB");
    assert.equal(formatFileSize(5 * 1024 * 1024), "5.0 MB");
  });
});

describe("ACCEPT_ATTRIBUTE", () => {
  it("lists allowed extensions only", () => {
    const extensions = ACCEPT_ATTRIBUTE.split(",");
    assert.ok(extensions.includes(".pdf"));
    assert.ok(extensions.includes(".pptx"));
    assert.ok(!extensions.includes(".html"));
    assert.ok(!extensions.includes(".svg"));
  });
});
