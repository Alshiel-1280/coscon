import { z } from "zod";
import { SHOT_STATUSES } from "@/lib/constants";

const shotStatusEnum = z.enum(SHOT_STATUSES);

export const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(120),
  shootDate: z.string().date().optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
});

export const createSceneSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export const updateSceneSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createShotSchema = z.object({
  title: z.string().trim().min(1).max(120),
  status: shotStatusEnum.optional().default("構想"),
  compositionMemo: z.string().max(2000).optional().nullable(),
});

export const updateShotSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  status: shotStatusEnum.optional(),
  compositionMemo: z.string().max(2000).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  sceneId: z.string().uuid().optional(),
});

export const reorderShotsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int().min(0),
        sceneId: z.string().uuid().optional(),
      }),
    )
    .min(1),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const lightingDiagramSchema = z.object({
  diagramJson: z.record(z.string(), z.unknown()),
});

export const inviteMemberSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
});

export const exportProjectPdfSchema = z.object({
  includeComments: z.boolean().optional().default(false),
});
