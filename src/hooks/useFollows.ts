import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useFollows = (profileId: string | null) => {
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profileId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { count: followers } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profileId);
    setFollowersCount(followers || 0);

    const { count: following } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profileId);
    setFollowingCount(following || 0);

    if (user && user.id !== profileId) {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profileId)
        .maybeSingle();
      setIsFollowing(!!data);
    }
  }, [profileId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleFollow = async () => {
    if (!currentUserId || !profileId || currentUserId === profileId) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", profileId);
      setIsFollowing(false);
      setFollowersCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: profileId });
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
    }
  };

  return { followersCount, followingCount, isFollowing, toggleFollow, currentUserId };
};
