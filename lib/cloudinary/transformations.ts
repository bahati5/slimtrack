/** Transformations par défaut (PRD §5.2). */
export const CLOUDINARY_FOLDERS = {
  meals: (userId: string, date: string) =>
    `slimtrack/meals/${userId}/${date}`,
  activities: (userId: string, date: string) =>
    `slimtrack/activities/${userId}/${date}`,
  avatars: (userId: string) => `slimtrack/avatars/${userId}`,
  progress: (userId: string) => `slimtrack/progress/${userId}`,
} as const;

export const CLOUDINARY_TRANSFORMS = {
  meal: "f_auto,q_auto,w_1200,c_limit",
  activity: "f_auto,q_auto,w_1200,c_limit",
  avatar: "f_auto,q_auto,w_200,h_200,c_thumb,g_face,r_max",
  progress: "f_auto,q_auto,w_1200,c_limit",
  videoMeal: "f_mp4,q_auto,w_1200,du_30",
} as const;

export type CloudinaryKind = keyof typeof CLOUDINARY_TRANSFORMS;
