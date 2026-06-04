"use client";

import {
  IconComponents,
  IconBrandTiktok,
  IconDatabase,
  IconHanger,
  IconHome,
  IconMessage,
  IconRobot,
  IconShieldCheck,
  IconTicket,
} from "@tabler/icons-react";
import type React from "react";
import { useState } from "react";

import ComponentsV2Builder from "@/components/admin-bot/ComponentsV2Builder";
import EmbedForm from "@/components/admin-bot/EmbedForm";
import EmbedPreview from "@/components/admin-bot/EmbedPreview";
import TemplateControls from "@/components/admin-bot/TemplateControls";
import TicketConfig from "@/components/admin-bot/TicketConfig";
import type { EmbedData } from "@/components/admin-bot/types";
import { AdminLogo, Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";

type BotTab = "embeds" | "components" | "tickets";

const initialEmbedData: EmbedData = {
  title: "Przykladowy Tytul",
  description: "To jest opis embeda. Mozesz go edytowac w panelu po lewej stronie.",
  url: "",
  color: "#5865f2",
  author: { name: "", url: "", icon_url: "" },
  thumbnail_url: "",
  image_url: "",
  footer: { text: "", icon_url: "" },
  timestamp: false,
  fields: [],
  buttons: [],
};

export function AdminBotPanel() {
  const [activeTab, setActiveTab] = useState<BotTab>("embeds");
  const [channelId, setChannelId] = useState("");
  const [content, setContent] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [embedData, setEmbedData] = useState<EmbedData>(initialEmbedData);

  const handleSend = async () => {
    if (!channelId) {
      setStatusMessage("Blad: wybierz kanal docelowy.");
      return;
    }

    setIsSending(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/admin/bot/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          content,
          embedData,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setStatusMessage("Sukces: embed zostal wyslany.");
      } else {
        setStatusMessage(`Blad: ${data.error || "wysylka nieudana"}`);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage("Blad: nie udalo sie wyslac zadania.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-black text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.024)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.024)_1px,transparent_1px)] bg-[size:120px_120px] opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      <Sidebar>
        <div className="relative flex min-h-screen w-full flex-col md:flex-row">
          <AdminBotSidebar />

          <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto grid w-full max-w-[1500px] gap-6">
              <header className="flex flex-col gap-4 py-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-300">Admin / Bot</p>
                  <h1 className="mt-2 font-poppins text-4xl font-medium md:text-5xl">
                    Bot panel
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">
                    Zarzadzaj wiadomosciami Discord, Components V2 i systemem ticketow z jednego panelu.
                  </p>
                </div>
              </header>

              <div className="admin-bot-surface overflow-hidden rounded-[28px] border border-white/10 bg-[#1f2229] shadow-2xl shadow-black/30">
                <div className="app-container">
                  <div className="bot-mode-nav">
                    <BotNavButton active={activeTab === "embeds"} label="Embeds" onClick={() => setActiveTab("embeds")}>
                      <IconMessage className="size-5" />
                    </BotNavButton>
                    <BotNavButton
                      active={activeTab === "components"}
                      label="Components V2"
                      onClick={() => setActiveTab("components")}
                    >
                      <IconComponents className="size-5" />
                    </BotNavButton>
                    <BotNavButton active={activeTab === "tickets"} label="Tickets" onClick={() => setActiveTab("tickets")}>
                      <IconTicket className="size-5" />
                    </BotNavButton>
                  </div>

                  {activeTab === "embeds" ? (
                    <>
                      <div className="panel scroll-styled">
                        <h2 className="app-title">Kreator Embedow</h2>
                        <div className="section">
                          <h3 className="section-title">Szablony embedow</h3>
                          <TemplateControls
                            kind="embed"
                            currentPayload={{ content, embedData, channelId }}
                            onLoad={(payload) => {
                              if (payload && typeof payload === "object") {
                                const nextPayload = payload as {
                                  channelId?: string;
                                  content?: string;
                                  embedData?: EmbedData;
                                };
                                setContent(nextPayload.content || "");
                                if (nextPayload.embedData) setEmbedData(nextPayload.embedData);
                                if (nextPayload.channelId) setChannelId(nextPayload.channelId);
                              }
                            }}
                          />
                        </div>
                        <EmbedForm
                          embedData={embedData}
                          setEmbedData={setEmbedData}
                          content={content}
                          setContent={setContent}
                          channelId={channelId}
                          setChannelId={setChannelId}
                          onSend={handleSend}
                          isSending={isSending}
                          statusMessage={statusMessage}
                        />
                      </div>
                      <div className="preview-panel">
                        <div className="preview-header">
                          <h3>Podglad na zywo</h3>
                          <span>Discord</span>
                        </div>
                        <div className="preview-content">
                          <EmbedPreview content={content} embedData={embedData} />
                        </div>
                      </div>
                    </>
                  ) : activeTab === "components" ? (
                    <ComponentsV2Builder />
                  ) : (
                    <TicketConfig />
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </Sidebar>

      <BotPanelStyles />
    </main>
  );
}

function BotNavButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={active ? "active" : ""}
    >
      {children}
    </button>
  );
}

function AdminBotSidebar() {
  const { open, setOpen } = useSidebar();

  return (
    <SidebarBody className="justify-between gap-10">
      <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <AdminLogo compact={!open} />
        <div className="mt-8 flex flex-col gap-2">
          <SidebarLink
            link={{
              href: "/admin",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                  <IconDatabase className="size-5" />
                </span>
              ),
              label: "Products",
            }}
          />
          <SidebarLink
            link={{
              href: "/admin/outfits",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                  <IconHanger className="size-5" />
                </span>
              ),
              label: "Outfits",
            }}
          />
          <SidebarLink
            link={{
              href: "/admin/tiktok-items",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                  <IconBrandTiktok className="size-5" />
                </span>
              ),
              label: "TikTok Items",
            }}
            onClick={() => setOpen(false)}
          />
          <SidebarLink
            link={{
              href: "/admin/bot",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30">
                  <IconRobot className="size-5" />
                </span>
              ),
              label: "Bot",
            }}
            className="bg-blue-500/15"
            onClick={() => setOpen(false)}
          />
          <SidebarLink
            link={{
              href: "/admin/restore",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                  <IconShieldCheck className="size-5" />
                </span>
              ),
              label: "Restore",
            }}
            onClick={() => setOpen(false)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <SidebarLink
          link={{
            href: "/",
            icon: (
              <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                <IconHome className="size-5" />
              </span>
            ),
            label: "Back to site",
          }}
        />
      </div>
    </SidebarBody>
  );
}

function BotPanelStyles() {
  return (
    <style>{`
.admin-bot-surface {
  --background: #36393f;
  --background-secondary: #2f3136;
  --background-tertiary: #202225;
  --text-normal: #dcddde;
  --text-muted: #72767d;
  --header-primary: #ffffff;
  --header-secondary: #b9bbbe;
  --interactive-normal: #b9bbbe;
  --interactive-hover: #dcddde;
  --brand: #5865f2;
  --brand-hover: #4752c4;
  --danger: #ed4245;
  --success: #3ba55c;
  --input-background: #40444b;
  color: var(--text-normal);
  font-family: var(--font-inter), Arial, sans-serif;
}
.admin-bot-surface * { box-sizing: border-box; }
.admin-bot-surface *::-webkit-scrollbar { width: 8px; height: 8px; background-color: var(--background-secondary); }
.admin-bot-surface *::-webkit-scrollbar-thumb { background-color: var(--background-tertiary); border-radius: 4px; }
.admin-bot-surface .app-container { display: flex; min-height: 720px; height: calc(100vh - 190px); max-height: 980px; max-width: 100%; }
.admin-bot-surface .bot-mode-nav {
  flex: 0 0 60px;
  background: var(--background-tertiary);
  border-right: 1px solid var(--background-tertiary);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
  gap: 10px;
}
.admin-bot-surface .bot-mode-nav button {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 0;
  background: var(--background-secondary);
  color: white;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background-color 0.2s ease, border-radius 0.2s ease;
}
.admin-bot-surface .bot-mode-nav button:hover,
.admin-bot-surface .bot-mode-nav button.active { background: var(--brand); border-radius: 12px; }
.admin-bot-surface .panel {
  flex: 0 0 450px;
  padding: 30px;
  overflow-y: auto;
  background-color: var(--background-secondary);
  border-right: 1px solid var(--background-tertiary);
  display: flex;
  flex-direction: column;
}
.admin-bot-surface .ticket-config-container,
.admin-bot-surface .components-v2-container { display: flex; width: 100%; height: 100%; min-width: 0; }
.admin-bot-surface .app-title {
  color: var(--header-primary);
  margin: 0 0 24px;
  font-size: 24px;
  font-weight: 800;
  text-align: center;
  letter-spacing: 0;
}
.admin-bot-surface .preview-panel { flex: 1; min-width: 0; background-color: var(--background); display: flex; flex-direction: column; position: relative; }
.admin-bot-surface .preview-header {
  min-height: 60px;
  border-bottom: 1px solid var(--background-tertiary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 30px;
  background-color: var(--background-secondary);
}
.admin-bot-surface .preview-header h3 { color: var(--header-primary); font-size: 16px; font-weight: 600; margin: 0; }
.admin-bot-surface .preview-header span { color: var(--text-muted); font-size: 12px; text-transform: uppercase; font-weight: 700; }
.admin-bot-surface .preview-content { flex: 1; padding: 40px; display: flex; justify-content: center; align-items: flex-start; overflow-y: auto; }
.admin-bot-surface .section { margin-bottom: 24px; }
.admin-bot-surface .section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--header-primary);
  text-transform: uppercase;
  margin: 0 0 16px;
  letter-spacing: 0;
  border-bottom: 2px solid var(--brand);
  padding-bottom: 4px;
  display: inline-block;
}
.admin-bot-surface .form-group { margin-bottom: 16px; }
.admin-bot-surface .form-label { display: block; font-weight: 700; color: var(--header-secondary); font-size: 12px; margin-bottom: 8px; text-transform: uppercase; }
.admin-bot-surface .form-input,
.admin-bot-surface .form-textarea,
.admin-bot-surface .form-select {
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  background-color: var(--input-background);
  border: 1px solid var(--background-tertiary);
  border-radius: 4px;
  color: var(--text-normal);
  font-size: 14px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
.admin-bot-surface .form-input:focus,
.admin-bot-surface .form-textarea:focus,
.admin-bot-surface .form-select:focus { outline: none; border-color: var(--brand); background-color: #111214; }
.admin-bot-surface .form-select { cursor: pointer; }
.admin-bot-surface .form-textarea { resize: vertical; min-height: 80px; font-family: inherit; }
.admin-bot-surface .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  border: 0;
  white-space: nowrap;
}
.admin-bot-surface .btn-primary { background-color: var(--brand); color: white; }
.admin-bot-surface .btn-primary:hover:not(:disabled) { background-color: var(--brand-hover); }
.admin-bot-surface .btn-secondary { background-color: #4f545c; color: white; }
.admin-bot-surface .btn-secondary:hover:not(:disabled) { background-color: #5d6269; }
.admin-bot-surface .btn-success { background-color: var(--success); color: white; }
.admin-bot-surface .btn-outline { background: transparent; border: 1px solid var(--interactive-normal); color: var(--interactive-normal); padding: 6px 12px; }
.admin-bot-surface .btn-outline:hover { border-color: var(--interactive-hover); color: var(--interactive-hover); }
.admin-bot-surface .btn-block { width: 100%; padding: 14px; font-size: 16px; font-weight: 600; }
.admin-bot-surface .btn-sm { padding: 4px 8px; font-size: 12px; }
.admin-bot-surface .btn:disabled,
.admin-bot-surface .btn[aria-disabled="true"],
.admin-bot-surface .btn-icon-danger[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; pointer-events: none; }
.admin-bot-surface .btn-icon-danger {
  background: transparent;
  border: 0;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.admin-bot-surface .btn-icon-danger:hover { color: var(--danger); }
.admin-bot-surface .divider { height: 1px; background: var(--background-tertiary); margin: 24px 0; }
.admin-bot-surface .flex-row { display: flex; gap: 12px; }
.admin-bot-surface input[type="color"] { appearance: none; border: 0; width: 30px; height: 30px; cursor: pointer; background: none; }
.admin-bot-surface input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
.admin-bot-surface input[type="color"]::-webkit-color-swatch { border: 1px solid rgba(0, 0, 0, 0.2); border-radius: 4px; }
.admin-bot-surface .color-code { font-family: monospace; color: var(--header-secondary); }
.admin-bot-surface .sticky-bottom {
  position: sticky;
  bottom: -30px;
  margin: 0 -30px -30px;
  padding: 20px 30px 30px;
  background: linear-gradient(to bottom, rgba(47, 49, 54, 0), var(--background-secondary) 20%);
  backdrop-filter: blur(2px);
  z-index: 10;
}
.admin-bot-surface .field-row {
  background: rgba(0, 0, 0, 0.1);
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  border: 1px solid transparent;
}
.admin-bot-surface .field-row:hover { border-color: var(--background-tertiary); }
.admin-bot-surface .field-options { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding-left: 5px; }
.admin-bot-surface .checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); cursor: pointer; }
.admin-bot-surface .checkbox-label:hover { color: var(--text-normal); }
.admin-bot-surface .status-message { text-align: center; margin-top: 12px; font-weight: 500; font-size: 14px; padding: 8px; border-radius: 4px; }
.admin-bot-surface .status-message.success { color: #43b581; background: rgba(67, 181, 129, 0.1); }
.admin-bot-surface .status-message.error { color: #f04747; background: rgba(240, 71, 71, 0.1); }
.admin-bot-surface .spin { animation: bot-panel-spin 1s linear infinite; }
@keyframes bot-panel-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.admin-bot-surface .discord-message { display: flex; width: 100%; max-width: 600px; animation: bot-panel-fade-in 0.3s ease-out; }
@keyframes bot-panel-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.admin-bot-surface .avatar { width: 40px; height: 40px; border-radius: 50%; background-color: var(--brand); margin-right: 16px; flex-shrink: 0; background-size: cover; background-position: center; margin-top: 2px; }
.admin-bot-surface .message-content { min-width: 0; flex: 1; }
.admin-bot-surface .username { font-weight: 500; color: var(--header-primary); margin-right: 0.25rem; }
.admin-bot-surface .timestamp { font-size: 0.75rem; color: var(--text-muted); margin-left: 0.25rem; }
.admin-bot-surface .message-text { margin-bottom: 8px; white-space: pre-wrap; color: var(--text-normal); font-size: 1rem; line-height: 1.375rem; }
.admin-bot-surface .embed { position: relative; display: flex; flex-direction: column; background-color: var(--background-secondary); border-radius: 4px; border-left: 4px solid var(--background-tertiary); padding: 12px 16px; max-width: 520px; width: 100%; }
.admin-bot-surface .embed-grid { display: grid; grid-template-columns: auto; gap: 8px; }
.admin-bot-surface .embed-author { display: flex; align-items: center; margin-bottom: 8px; }
.admin-bot-surface .embed-author-icon { width: 24px; height: 24px; border-radius: 50%; margin-right: 8px; }
.admin-bot-surface .embed-author-name { font-size: 14px; font-weight: 600; color: var(--header-primary); }
.admin-bot-surface .embed-title { font-size: 16px; font-weight: 600; color: var(--brand); margin-bottom: 8px; display: block; }
.admin-bot-surface .embed-title:hover { text-decoration: underline; }
.admin-bot-surface .embed-description { font-size: 14px; color: var(--text-normal); line-height: 1.375rem; white-space: pre-wrap; }
.admin-bot-surface .embed-fields { display: flex; flex-direction: row; flex-wrap: wrap; margin-top: 8px; gap: 8px; }
.admin-bot-surface .embed-field { flex: 1; min-width: 150px; margin-bottom: 4px; }
.admin-bot-surface .embed-field.inline { flex: 0 0 auto; min-width: unset; margin-right: 16px; }
.admin-bot-surface .embed-field-name { font-size: 14px; font-weight: 600; color: var(--header-secondary); margin-bottom: 2px; }
.admin-bot-surface .embed-field-value { font-size: 14px; color: var(--text-normal); white-space: pre-wrap; line-height: 1.375rem; }
.admin-bot-surface .embed-image { margin-top: 16px; max-width: 100%; border-radius: 4px; overflow: hidden; }
.admin-bot-surface .embed-image img { max-width: 100%; max-height: 300px; display: block; }
.admin-bot-surface .embed-thumbnail { position: absolute; top: 16px; right: 16px; max-width: 80px; max-height: 80px; border-radius: 4px; object-fit: cover; }
.admin-bot-surface .embed-footer { display: flex; align-items: center; margin-top: 8px; }
.admin-bot-surface .embed-footer-icon { width: 20px; height: 20px; border-radius: 50%; margin-right: 8px; }
.admin-bot-surface .embed-footer-text { font-size: 12px; color: var(--text-muted); line-height: 16px; }
.admin-bot-surface .components-container { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
.admin-bot-surface .action-row { display: flex; flex-wrap: wrap; gap: 8px; }
.admin-bot-surface .discord-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 32px; padding: 4px 16px; border-radius: 3px; font-size: 14px; font-weight: 500; color: white; border: 0; line-height: 16px; }
.admin-bot-surface .discord-btn-primary { background-color: #5865f2; }
.admin-bot-surface .discord-btn-secondary,
.admin-bot-surface .discord-btn-link { background-color: #4f545c; }
.admin-bot-surface .discord-btn-success { background-color: #2d7d46; }
.admin-bot-surface .discord-btn-danger { background-color: #ed4245; }
.admin-bot-surface .text-toolbar { display: flex; gap: 4px; margin-bottom: 8px; background: var(--background-tertiary); padding: 6px; border-radius: 4px; flex-wrap: wrap; }
.admin-bot-surface .toolbar-btn { background: transparent; border: 0; color: var(--text-muted); cursor: pointer; padding: 4px 8px; border-radius: 3px; font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: center; min-width: 24px; }
.admin-bot-surface .toolbar-btn:hover { background-color: var(--background); color: var(--text-normal); }
.admin-bot-surface .toolbar-divider { width: 1px; background-color: var(--background-secondary); margin: 0 4px; }
.admin-bot-surface .discord-code { background-color: var(--background-secondary); font-family: Consolas, "Courier New", monospace; font-size: 85%; padding: 2px 4px; border-radius: 3px; }
.admin-bot-surface .discord-pre { background-color: var(--background-secondary); font-family: Consolas, "Courier New", monospace; padding: 8px; border-radius: 4px; border: 1px solid var(--background-tertiary); margin-top: 4px; overflow-x: auto; white-space: pre-wrap; color: var(--text-normal); }
.admin-bot-surface .discord-spoiler { background-color: #202225; color: transparent; padding: 0 2px; border-radius: 3px; cursor: pointer; }
.admin-bot-surface .discord-spoiler:hover { background-color: rgba(255, 255, 255, 0.1); color: var(--text-normal); }
.admin-bot-surface .discord-mention { background-color: rgba(88, 101, 242, 0.3); color: #dee0fc; border-radius: 3px; padding: 0 2px; font-weight: 500; }
.admin-bot-surface .discord-emoji { width: 20px; height: 20px; vertical-align: bottom; margin: 0 1px; }
.admin-bot-surface .v2-editor-block { background: rgba(0, 0, 0, 0.12); border: 1px solid var(--background-tertiary); border-radius: 6px; padding: 12px; margin-bottom: 12px; }
.admin-bot-surface .v2-editor-block-header { display: flex; align-items: center; justify-content: space-between; color: var(--header-primary); margin-bottom: 10px; font-size: 13px; }
.admin-bot-surface .v2-message { max-width: 760px; }
.admin-bot-surface .v2-stack { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.admin-bot-surface .v2-container { width: 100%; max-width: 660px; background: #111214; border: 1px solid #2b2d31; border-left: 4px solid #87ccab; border-radius: 8px; padding: 14px 16px; box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03) inset; }
.admin-bot-surface .v2-container.spoiler,
.admin-bot-surface .v2-thumbnail.spoiler,
.admin-bot-surface .v2-gallery-item.spoiler,
.admin-bot-surface .v2-file.spoiler { filter: blur(2px); }
.admin-bot-surface .v2-text { color: #dbdee1; font-size: 15px; line-height: 1.45; white-space: pre-wrap; }
.admin-bot-surface .v2-text h1,
.admin-bot-surface .v2-text h2,
.admin-bot-surface .v2-text h3 { color: #f2f3f5; margin: 0; }
.admin-bot-surface .v2-separator { height: 8px; }
.admin-bot-surface .v2-separator.large { height: 16px; }
.admin-bot-surface .v2-separator.with-line { border-top: 1px solid #2b2d31; margin-top: 10px; padding-top: 10px; }
.admin-bot-surface .v2-section { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.admin-bot-surface .v2-section-text { min-width: 0; flex: 1; }
.admin-bot-surface .v2-section-accessory { flex: 0 0 auto; }
.admin-bot-surface .text-muted { color: var(--text-muted); }
.admin-bot-surface .text-small { font-size: 12px; line-height: 1.4; }
.admin-bot-surface .template-controls { background: rgba(0, 0, 0, 0.1); border: 1px solid var(--background-tertiary); border-radius: 6px; padding: 12px; }
.admin-bot-surface .v2-editor-subblock { display: flex; flex-direction: column; gap: 8px; background: rgba(0, 0, 0, 0.16); border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 5px; padding: 10px; margin-top: 8px; }
.admin-bot-surface .v2-warning-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; padding: 10px 12px; border: 1px solid rgba(250, 166, 26, 0.35); border-radius: 6px; color: #faa61a; background: rgba(250, 166, 26, 0.08); font-size: 12px; line-height: 1.4; }
.admin-bot-surface .v2-select { min-height: 32px; min-width: 220px; display: inline-flex; align-items: center; justify-content: space-between; gap: 16px; padding: 6px 10px; border: 1px solid #3f4147; border-radius: 3px; background: #2b2d31; color: #b5bac1; font-size: 14px; }
.admin-bot-surface .v2-thumbnail { width: 72px; height: 72px; border-radius: 6px; background: #2b2d31; border: 1px solid #3f4147; overflow: hidden; display: flex; align-items: center; justify-content: center; color: #949ba4; font-size: 12px; }
.admin-bot-surface .v2-thumbnail img { width: 100%; height: 100%; object-fit: cover; }
.admin-bot-surface .v2-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
.admin-bot-surface .v2-gallery-item { min-height: 96px; background: #2b2d31; border: 1px solid #3f4147; border-radius: 6px; overflow: hidden; color: #949ba4; display: flex; flex-direction: column; justify-content: center; }
.admin-bot-surface .v2-gallery-item img { width: 100%; height: 140px; object-fit: cover; display: block; }
.admin-bot-surface .v2-gallery-caption { padding: 6px 8px; color: #b5bac1; font-size: 12px; background: rgba(0, 0, 0, 0.18); }
.admin-bot-surface .v2-file { display: flex; align-items: center; gap: 10px; width: fit-content; max-width: 100%; padding: 8px 10px; border: 1px solid #3f4147; border-radius: 6px; background: #2b2d31; color: #dbdee1; }
.admin-bot-surface .v2-file code { max-width: 360px; overflow: hidden; text-overflow: ellipsis; color: #b5bac1; }
.admin-bot-surface .restore-btn {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 10px 14px;
  color: #f8fafc;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
}
.admin-bot-surface .restore-btn:hover:not(:disabled) { transform: translateY(-1px); border-color: rgba(147, 197, 253, 0.45); }
.admin-bot-surface .restore-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.admin-bot-surface .restore-btn-primary { background: linear-gradient(135deg, #2563eb, #4f46e5); }
.admin-bot-surface .restore-btn-success { background: linear-gradient(135deg, #059669, #0f766e); }
.admin-bot-surface .restore-btn-muted { background: rgba(255, 255, 255, 0.06); }
.admin-bot-surface .restore-input {
  width: 100%;
  min-height: 46px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.45);
  color: #f8fafc;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
}
.admin-bot-surface .restore-input:focus { border-color: rgba(96, 165, 250, 0.65); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18); }
@media (max-width: 920px) {
  .admin-bot-surface .app-container,
  .admin-bot-surface .components-v2-container,
  .admin-bot-surface .ticket-config-container { flex-direction: column; height: auto; min-height: 100vh; max-height: none; }
  .admin-bot-surface .bot-mode-nav { width: 100%; height: 56px; flex: 0 0 56px; flex-direction: row; justify-content: center; }
  .admin-bot-surface .panel { flex: none; width: 100%; border-right: 0; border-bottom: 1px solid var(--background-tertiary); }
  .admin-bot-surface .preview-panel { min-height: 420px; }
  .admin-bot-surface .preview-content { padding: 20px; }
  .admin-bot-surface .flex-row { flex-direction: column; }
}
`}</style>
  );
}
