"use client";

import { useEffect, useState } from "react";

import styles from "./HeroSection.module.css";

type GuildStatsResponse = {
  memberCount: number | null;
};

export function ServerMembersBadge() {
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/discord/guild")
      .then((response) => response.json())
      .then((data: GuildStatsResponse) => {
        if (!cancelled) {
          setMemberCount(data.memberCount);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMemberCount(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.customersBadge}>
      <div className={styles.customersAvatars} aria-hidden="true">
        <div className={styles.customersAvatar}>
          <img src="https://images-eds-ssl.xboxlive.com/image?url=4rt9.lXDC4H_93laV1_eHHFT949fUipzkiFOBH3fAiZZUCdYojwUyX2aTonS1aIwMrx6NUIsHfUHSLzjGJFxxsG72wAo9EWJR4yQWyJJaDaqSp8L_JnVcp7d1FDT8JeCh813ShhcwYXsWmJABMaxDBwfxTpfofZ83pyHlOgG7WM-&format=source&h=210" alt="discord" />
        </div>
      </div>

      <div className={styles.customersText}>
        <span>Join</span>
        <span className={styles.customersNumber}>
          +{memberCount ? memberCount.toLocaleString("en-US") : "..."}
        </span>
        <span>server members</span>
      </div>
    </div>
  );
}
