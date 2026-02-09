import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Scene, Shot } from "@/types/app";

type ProjectSummary = {
  title: string;
  shootDate: string | null;
  location: string | null;
  status: string;
};

function mapStatus(status: string): string {
  switch (status) {
    case "構想":
      return "idea";
    case "未撮影":
      return "todo";
    case "撮影済":
      return "shot";
    case "現像済":
      return "edited";
    case "共有済":
      return "shared";
    default:
      return status;
  }
}

function clampText(value: string, limit = 120): string {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit - 3)}...`;
}

export async function buildProjectSummaryPdf(input: {
  project: ProjectSummary;
  scenes: Array<
    Pick<Scene, "id" | "title" | "sort_order"> & {
      shots: Pick<Shot, "id" | "title" | "status" | "composition_memo" | "sort_order">[];
    }
  >;
  comments?: Array<{
    body: string;
    created_at: string;
    user_name?: string | null;
  }>;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([595, 842]);
  const margin = 42;
  let y = 800;

  function ensureSpace(required: number) {
    if (y - required < margin) {
      page = doc.addPage([595, 842]);
      y = 800;
    }
  }

  function writeLine(
    text: string,
    options?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> },
  ) {
    ensureSpace((options?.size ?? 10) + 8);
    page.drawText(text, {
      x: margin,
      y,
      size: options?.size ?? 10,
      font: options?.bold ? bold : regular,
      color: options?.color ?? rgb(0.12, 0.14, 0.19),
    });
    y -= (options?.size ?? 10) + 8;
  }

  writeLine("Cosplay Shoot Storyboard Export", {
    size: 18,
    bold: true,
  });
  writeLine(`Project: ${clampText(input.project.title, 70)}`, {
    size: 12,
    bold: true,
  });
  writeLine(
    `Date: ${input.project.shootDate ?? "-"}  Location: ${input.project.location ?? "-"}  Status: ${input.project.status}`,
  );
  writeLine(`Generated at: ${new Date().toISOString()}`);
  y -= 6;

  for (const scene of input.scenes) {
    writeLine(`Scene ${scene.sort_order + 1}: ${clampText(scene.title, 80)}`, {
      size: 12,
      bold: true,
      color: rgb(0.25, 0.28, 0.42),
    });

    if (scene.shots.length === 0) {
      writeLine("  (no shots)");
      y -= 4;
      continue;
    }

    for (const shot of scene.shots) {
      writeLine(
        `- [${mapStatus(shot.status)}] ${clampText(shot.title, 90)}`,
        { size: 10, bold: true },
      );
      if (shot.composition_memo) {
        writeLine(`  memo: ${clampText(shot.composition_memo.replace(/\s+/g, " "), 110)}`);
      }
    }
    y -= 4;
  }

  if (input.comments && input.comments.length > 0) {
    ensureSpace(40);
    y -= 4;
    writeLine("Project Comments", {
      size: 13,
      bold: true,
      color: rgb(0.25, 0.28, 0.42),
    });
    for (const comment of input.comments) {
      writeLine(
        `- ${comment.user_name ?? "member"} (${new Date(comment.created_at).toLocaleString()}): ${clampText(comment.body.replace(/\s+/g, " "), 105)}`,
      );
    }
  }

  return doc.save();
}
