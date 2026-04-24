import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { FRAMES, FRAME_MAP } from "@/lib/frameConfig";
import FramedAvatar, { FRAMED_AVATAR_SIZES, type FramedAvatarSize } from "@/components/FramedAvatar";

/**
 * Internal dev/QA page: renders every registered frame at every size preset
 * with a few sample avatars, so we can visually confirm that
 * `innerScale` / `innerOffsetY` match between Profile and VoiceRoom contexts.
 *
 * Visit at /dev/frames
 */
const SIZE_KEYS: FramedAvatarSize[] = ["sm", "md", "lg", "xl"];

const SAMPLE_AVATARS = [
  "https://i.pravatar.cc/200?img=12",
  "https://i.pravatar.cc/200?img=32",
  "https://i.pravatar.cc/200?img=47",
  "https://i.pravatar.cc/200?img=68",
];

const FramePreviewPage = () => {
  const navigate = useNavigate();
  const [avatarIdx, setAvatarIdx] = useState(0);
  const avatar = SAMPLE_AVATARS[avatarIdx];

  // Build the list dynamically from the single source of truth.
  // Includes the legacy `boss-frame` (only kept in FRAME_MAP, not in FRAMES).
  const allFrames = [
    ...FRAMES.map((f) => ({ key: f.key, name: f.name })),
    ...Object.keys(FRAME_MAP)
      .filter((k) => !FRAMES.some((f) => f.key === k))
      .map((k) => ({ key: k, name: k })),
    { key: "__none__", name: "بدون إطار (No frame)" },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Frame Preview · Dev</h1>
          <p className="text-sm text-muted-foreground">
            Verifies <code>innerScale</code> &amp; <code>innerOffsetY</code> across sizes.
            Same component used in Profile &amp; VoiceRoom.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-2 rounded-lg bg-card border border-border hover:bg-accent/10 flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          رجوع
        </button>
      </div>

      {/* Avatar switcher */}
      <div className="max-w-6xl mx-auto mb-6 flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">Sample avatar:</span>
        {SAMPLE_AVATARS.map((src, i) => (
          <button
            key={src}
            onClick={() => setAvatarIdx(i)}
            className={`w-10 h-10 rounded-full overflow-hidden border-2 transition ${
              i === avatarIdx ? "border-primary" : "border-border opacity-60"
            }`}
          >
            <img loading="lazy" decoding="async" src={src} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
        <span className="ms-auto text-xs text-muted-foreground">
          Sizes: {SIZE_KEYS.map((k) => `${k}=${FRAMED_AVATAR_SIZES[k]}px`).join(" · ")}
        </span>
      </div>

      {/* Grid: one row per frame, one column per size */}
      <div className="max-w-6xl mx-auto space-y-4">
        {allFrames.map(({ key, name }) => {
          const equipped = key === "__none__" ? null : key;
          return (
            <div
              key={key}
              className="rounded-xl border border-border bg-card/40 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold">{name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{key}</div>
                </div>
              </div>
              <div className="flex items-end gap-6 flex-wrap">
                {SIZE_KEYS.map((sz) => (
                  <div key={sz} className="flex flex-col items-center gap-2">
                    <FramedAvatar
                      avatarUrl={avatar}
                      equippedFrame={equipped}
                      size={sz}
                    />
                    <span className="text-xs text-muted-foreground">
                      {sz} · {FRAMED_AVATAR_SIZES[sz]}px
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FramePreviewPage;
