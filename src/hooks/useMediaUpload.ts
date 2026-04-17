import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type UploadOptions = {
  file: File;
  fileType?: "image" | "gif";
  folder?: string;
};

/**
 * Upload media via the `upload-media` edge function.
 * Enforces NOVA P4+ requirement for GIFs server-side.
 */
export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);

  const upload = async ({ file, fileType, folder = "uploads" }: UploadOptions): Promise<string | null> => {
    setUploading(true);
    try {
      const isGif = fileType === "gif" || file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
      const resolvedType = isGif ? "gif" : "image";

      const form = new FormData();
      form.append("file", file);
      form.append("fileType", resolvedType);
      form.append("folder", folder);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("يجب تسجيل الدخول أولاً");
        return null;
      }

      const url = `https://tyeejjadmdcbkhfowhzw.supabase.co/functions/v1/upload-media`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 403 && json?.required_level) {
          toast.error(`🔒 رفع GIF حصري لأعضاء NOVA P${json.required_level}+`);
        } else {
          toast.error(json?.error || "فشل الرفع");
        }
        return null;
      }
      return json.url as string;
    } catch (e: any) {
      toast.error(e.message || "خطأ في الرفع");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
}
