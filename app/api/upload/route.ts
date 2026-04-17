import { NextResponse, type NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@/lib/supabase/server";
import {
  CLOUDINARY_FOLDERS,
  CLOUDINARY_TRANSFORMS,
} from "@/lib/cloudinary/transformations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Génère une signature Cloudinary côté serveur — le secret ne sort jamais.
 * Auth : utilisateur Supabase connecté uniquement.
 *
 * Body: { kind: 'meal'|'activity'|'avatar'|'progress', date?: 'YYYY-MM-DD' }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    kind: "meal" | "activity" | "avatar" | "progress";
    date?: string;
  };

  let folder: string;
  let transformation: string;
  const today = new Date().toISOString().slice(0, 10);

  switch (body.kind) {
    case "meal":
      folder = CLOUDINARY_FOLDERS.meals(user.id, body.date ?? today);
      transformation = CLOUDINARY_TRANSFORMS.meal;
      break;
    case "activity":
      folder = CLOUDINARY_FOLDERS.activities(user.id, body.date ?? today);
      transformation = CLOUDINARY_TRANSFORMS.activity;
      break;
    case "avatar":
      folder = CLOUDINARY_FOLDERS.avatars(user.id);
      transformation = CLOUDINARY_TRANSFORMS.avatar;
      break;
    case "progress":
      folder = CLOUDINARY_FOLDERS.progress(user.id);
      transformation = CLOUDINARY_TRANSFORMS.progress;
      break;
    default:
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, transformation },
    process.env.CLOUDINARY_API_SECRET!,
  );

  return NextResponse.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    folder,
    transformation,
  });
}
