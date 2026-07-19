import { useEffect, useRef, useState } from "react";
import {
  CARD_ACCENTS,
  CARD_FRAMES,
  type CardManifest,
  CardManifestSchema,
  CARD_PATTERNS,
  CARD_TEMPLATES,
  type PublicCard,
} from "@/core/types";
import { HoloCard } from "./HoloCard";

const SAMPLE_PHOTO =
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85";

const SAMPLE_MANIFEST: CardManifest = {
  version: 1,
  locale: "pt-BR",
  template: "aurora",
  accent: "rose",
  customColor: "#e72e83",
  frame: "prism",
  pattern: "waves",
  title: "Essa foto é muito a gente",
  message: "Todo mundo junto, ninguém olhando para a câmera. Tem a nossa cara.",
  signature: "Com carinho, Gui",
  occasion: "Vale guardar",
  photoHeight: 49,
  photoPositionX: 50,
  photoPositionY: 50,
};

interface CreatedCard extends PublicCard {
  editToken: string;
}

const STORAGE_KEY = "holocard:last-card";
const TEMPLATE_LABELS: Record<CardManifest["template"], string> = {
  aurora: "Aurora",
  confetti: "Confete",
  keepsake: "Lembrança",
};
const THEME_LABELS: Record<CardManifest["accent"], string> = {
  rose: "Rosa",
  aqua: "Azul",
  sun: "Dourado",
  violet: "Violeta",
  mint: "Menta",
  custom: "Personalizada",
};
const FRAME_LABELS: Record<CardManifest["frame"], string> = {
  silver: "Prata",
  gold: "Dourada",
  prism: "Prisma",
  ink: "Escura",
  copper: "Cobre",
  pearl: "Pérola",
};
const PATTERN_LABELS: Record<CardManifest["pattern"], string> = {
  none: "Sem padrão",
  rays: "Raios",
  grid: "Grade",
  sparkles: "Brilhos",
  waves: "Ondas",
  stars: "Estrelas",
};
const SOCIAL_THEME_COLORS: Record<CardManifest["accent"], [string, string]> = {
  rose: ["oklch(0.49 0.19 353)", "oklch(0.38 0.12 204)"],
  aqua: ["oklch(0.5 0.13 205)", "oklch(0.4 0.14 255)"],
  sun: ["oklch(0.56 0.14 76)", "oklch(0.45 0.14 25)"],
  violet: ["oklch(0.49 0.17 305)", "oklch(0.42 0.14 265)"],
  mint: ["oklch(0.48 0.12 160)", "oklch(0.4 0.11 200)"],
  custom: ["#e72e83", "#3a1328"],
};

export default function App() {
  const creatorRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const openDialogRef = useRef<HTMLDialogElement>(null);
  const slugInputRef = useRef<HTMLInputElement>(null);
  const draftManifestRef = useRef<CardManifest | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [prompt, setPrompt] = useState("");
  const [signature, setSignature] = useState("");
  const [password, setPassword] = useState("");
  const [existingUrl, setExistingUrl] = useState("");
  const [existingPassword, setExistingPassword] = useState("");
  const [editorPassword, setEditorPassword] = useState("");
  const [slugDraft, setSlugDraft] = useState("");
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [openError, setOpenError] = useState("");
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [card, setCard] = useState<CreatedCard | null>(null);
  const [busy, setBusy] = useState<
    "create" | "open" | "save" | "slug" | "password" | "revise" | "delete" | null
  >(null);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const restored = JSON.parse(saved) as CreatedCard;
      const manifest = CardManifestSchema.parse(restored.manifest);
      draftManifestRef.current = manifest;
      setCard({ ...restored, manifest });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!isEditingSlug) return;
    const frame = requestAnimationFrame(() => {
      slugInputRef.current?.focus();
      slugInputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [isEditingSlug]);

  function scrollToCreator() {
    creatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function choosePhoto(file: File | undefined) {
    setError("");
    if (!file) return;
    try {
      const optimized = await optimizePhoto(file);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhoto(optimized);
      setPhotoPreview(URL.createObjectURL(optimized));
      setAnnouncement("Foto pronta para o cartão.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir essa foto.");
    }
  }

  async function createCard(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!photo) return setError("Escolha uma foto primeiro.");
    if (prompt.trim().length < 8) return setError("Conte um pouco mais sobre a mensagem.");
    if (password.length < 8) return setError("Crie uma senha com pelo menos 8 caracteres.");

    setBusy("create");
    try {
      const data = new FormData();
      data.set("photo", photo, "photo.jpg");
      data.set("prompt", prompt.trim());
      data.set("signature", signature.trim());
      data.set("password", password);
      const response = await fetch("/api/cards", { method: "POST", body: data });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível criar o cartão.");
      const created = payload.card as CreatedCard;
      draftManifestRef.current = created.manifest;
      setCard(created);
      setIsDirty(false);
      setPassword("");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
      setAnnouncement("Cartão publicado.");
      requestAnimationFrame(() => {
        editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      try {
        await uploadSocialPreview(created, photo);
      } catch (cause) {
        console.warn("Social preview fallback will use the photo", cause);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Algo deu errado.");
    } finally {
      setBusy(null);
    }
  }

  async function openExistingCard(event: React.FormEvent) {
    event.preventDefault();
    setOpenError("");
    if (existingPassword.length < 8) {
      setOpenError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setBusy("open");
    try {
      const response = await fetch("/api/cards/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: existingUrl.trim(), password: existingPassword }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error ?? "URL ou senha incorretos.");
      const opened = payload.card as CreatedCard;
      draftManifestRef.current = opened.manifest;
      setCard(opened);
      setIsDirty(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(opened));
      setExistingPassword("");
      openDialogRef.current?.close();
      requestAnimationFrame(() => {
        editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (cause) {
      setOpenError(cause instanceof Error ? cause.message : "URL ou senha incorretos.");
    } finally {
      setBusy(null);
    }
  }

  async function reviseCard(event: React.FormEvent) {
    event.preventDefault();
    if (!card || revisionPrompt.trim().length < 4) return;
    setBusy("revise");
    setError("");
    try {
      const response = await fetch(`/api/cards/${card.id}/revisions`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-edit-token": card.editToken },
        body: JSON.stringify({ prompt: revisionPrompt.trim() }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível revisar.");
      const updated = { ...(payload.card as PublicCard), editToken: card.editToken } as CreatedCard;
      draftManifestRef.current = updated.manifest;
      setCard(updated);
      setIsDirty(false);
      setRevisionPrompt("");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setAnnouncement(`Revisão ${updated.revisionCount} publicada.`);
      try {
        let sourcePhoto: Blob;
        if (photo) {
          sourcePhoto = photo;
        } else {
          const photoResponse = await fetch(updated.photoUrl);
          if (!photoResponse.ok) throw new Error("Could not reload card photo");
          sourcePhoto = await photoResponse.blob();
        }
        await uploadSocialPreview(updated, sourcePhoto);
      } catch (cause) {
        console.warn("Could not refresh social preview after revision", cause);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível revisar.");
    } finally {
      setBusy(null);
    }
  }

  function updateManifest(patch: Partial<CardManifest>) {
    setCard((current) => {
      if (!current) return current;
      const manifest = {
        ...(draftManifestRef.current ?? current.manifest),
        ...patch,
      };
      draftManifestRef.current = manifest;
      return { ...current, manifest };
    });
    setIsDirty(true);
  }

  function updateTextField(
    field: "occasion" | "title" | "message" | "signature",
    value: string,
  ) {
    const limits = { occasion: 40, title: 60, message: 320, signature: 60 };
    if (!card) return;
    const normalized = field === "message" ? value : value.replace(/\s+/g, " ");
    draftManifestRef.current = {
      ...(draftManifestRef.current ?? card.manifest),
      [field]: normalized.slice(0, limits[field]),
    };
  }

  async function saveCard() {
    if (!card || !isDirty) return;
    setBusy("save");
    setError("");
    try {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json", "x-edit-token": card.editToken },
        body: JSON.stringify({ manifest: draftManifestRef.current ?? card.manifest }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar as mudanças.");
      const updated = { ...(payload.card as PublicCard), editToken: card.editToken } as CreatedCard;
      draftManifestRef.current = updated.manifest;
      setCard(updated);
      setIsDirty(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setAnnouncement("Mudanças salvas.");

      try {
        let sourcePhoto: Blob;
        if (photo) {
          sourcePhoto = photo;
        } else {
          const photoResponse = await fetch(updated.photoUrl);
          if (!photoResponse.ok) throw new Error("Could not reload card photo");
          sourcePhoto = await photoResponse.blob();
        }
        await uploadSocialPreview(updated, sourcePhoto);
      } catch (cause) {
        console.warn("Could not refresh social preview after direct edit", cause);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar as mudanças.");
    } finally {
      setBusy(null);
    }
  }

  async function saveEditorPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!card || editorPassword.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setBusy("password");
    setError("");
    try {
      const response = await fetch(`/api/cards/${card.id}/password`, {
        method: "PUT",
        headers: { "content-type": "application/json", "x-edit-token": card.editToken },
        body: JSON.stringify({ password: editorPassword }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar a senha.");
      setEditorPassword("");
      setAnnouncement("Senha de edição salva.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a senha.");
    } finally {
      setBusy(null);
    }
  }

  async function saveSlug(event: React.FormEvent) {
    event.preventDefault();
    if (!card || !slugDraft.trim()) return;
    setBusy("slug");
    setError("");
    try {
      const response = await fetch(`/api/cards/${card.id}/slug`, {
        method: "PUT",
        headers: { "content-type": "application/json", "x-edit-token": card.editToken },
        body: JSON.stringify({ slug: slugDraft.trim() }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível mudar a URL.");
      const updated = { ...(payload.card as PublicCard), editToken: card.editToken } as CreatedCard;
      setCard(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSlugDraft(updated.slug);
      setIsEditingSlug(false);
      setAnnouncement("URL atualizada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível mudar a URL.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteCard() {
    if (!card || !confirm("Apagar este cartão e a foto permanentemente?")) return;
    setBusy("delete");
    setError("");
    try {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "DELETE",
        headers: { "x-edit-token": card.editToken },
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível apagar.");
      setCard(null);
      draftManifestRef.current = null;
      setIsDirty(false);
      localStorage.removeItem(STORAGE_KEY);
      setAnnouncement("Cartão e foto apagados.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível apagar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="holocard, página inicial">
          holocard <span>✦</span>
        </a>
        <div className="header-actions">
          <button
            className="header-open"
            type="button"
            onClick={() => {
              setOpenError("");
              openDialogRef.current?.showModal();
            }}
          >
            Abrir cartão
          </button>
          <button className="header-cta" type="button" onClick={scrollToCreator}>
            Fazer cartão
          </button>
        </div>
      </header>

      <dialog className="open-card-dialog" ref={openDialogRef}>
        <form onSubmit={openExistingCard}>
          <div className="dialog-heading">
            <div>
              <p>Continuar editando</p>
              <h2>Abra um cartão existente.</h2>
            </div>
            <button
              className="dialog-close"
              type="button"
              aria-label="Fechar"
              onClick={() => openDialogRef.current?.close()}
            >
              ×
            </button>
          </div>
          <label className="field">
            <span>URL do cartão</span>
            <input
              type="url"
              required
              placeholder="https://holocard.page/seu-cartao"
              value={existingUrl}
              onChange={(event) => setExistingUrl(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="current-password"
              value={existingPassword}
              onChange={(event) => setExistingPassword(event.target.value)}
            />
          </label>
          {openError ? <p className="dialog-error">{openError}</p> : null}
          <button className="primary-button wide" type="submit" disabled={busy !== null}>
            {busy === "open" ? "Abrindo…" : "Abrir editor"}
          </button>
        </form>
      </dialog>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <h1>
              Toda ocasião 🩷 merece um holocard <span>✦</span>
            </h1>
            <p className="hero-body">
              Surpreenda quem você gosta com um cartão feito só para ela. Conte a ocasião e o
              holocard monta a mensagem, o visual e o link para você enviar.
            </p>
            <div className="hero-actions">
              <button className="primary-button" type="button" onClick={scrollToCreator}>
                Fazer um cartão
              </button>
              <a className="text-link" href="#como-funciona">
                Como funciona
              </a>
            </div>
            <p className="hero-trust">
              Não precisa criar conta. Você pode pedir 2 ajustes e apagar o cartão quando quiser.
            </p>
          </div>
          <section className="hero-card" aria-label="Exemplo interativo de holocard">
            <HoloCard manifest={SAMPLE_MANIFEST} photoUrl={SAMPLE_PHOTO} />
            <p>Mexa o cursor para ver a luz mudar.</p>
          </section>
        </section>

        <section className="how" id="como-funciona">
          <div>
            <span>1</span>
            <h3>Escolha a foto</h3>
            <p>Ela é reduzida no seu próprio navegador antes do envio.</p>
          </div>
          <div>
            <span>2</span>
            <h3>Escreva do seu jeito</h3>
            <p>O texto é revisado sem trocar nomes nem inventar detalhes.</p>
          </div>
          <div>
            <span>3</span>
            <h3>Mande o link</h3>
            <p>A pessoa abre no celular e vê o cartão na hora.</p>
          </div>
        </section>

        <section className="creator" ref={creatorRef}>
          <div className="creator-intro">
            <p>Agora é a sua vez</p>
            <h2>Escolha uma foto e escreva como você falaria.</h2>
            <p>
              Pode mandar o texto do jeito que vier, em qualquer idioma. O holocard corrige a
              escrita e organiza a mensagem sem inventar nomes ou fatos.
            </p>
          </div>

          <form className="creator-intake" onSubmit={createCard}>
            <div className="field intake-photo">
              <span>Foto</span>
              <label className={`photo-input ${photoPreview ? "has-photo" : ""}`}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Prévia da foto escolhida" />
                ) : (
                  <span>
                    <strong>Adicionar uma foto</strong>
                    JPG, PNG ou WebP · até 8 MB
                  </span>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => choosePhoto(event.target.files?.[0])}
                />
              </label>
            </div>

            <label className="field intake-message">
              <span>O que você quer falar para essa pessoa?</span>
              <textarea
                value={prompt}
                maxLength={800}
                rows={10}
                placeholder="Ex.: A Tally faz aniversário. Somos amigas desde a escola. Quero desejar um ano leve."
                onChange={(event) => setPrompt(event.target.value)}
              />
              <small>{prompt.length}/800</small>
            </label>

            <div className="intake-side">
              <label className="field">
                <span>Quem assina? (opcional)</span>
                <input
                  value={signature}
                  maxLength={60}
                  placeholder="Ex.: Com carinho, Ju"
                  onChange={(event) => setSignature(event.target.value)}
                />
                <small>{signature.length}/60</small>
              </label>
              <label className="field">
                <span>Senha para editar depois</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="Mínimo de 8 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <small>Você vai usar essa senha para editar ou apagar o cartão.</small>
              </label>
              <button className="primary-button wide" type="submit" disabled={busy !== null}>
                {busy === "create" ? "Montando o cartão…" : "Fazer meu holocard"}
              </button>
              <p className="privacy-note">A foto fica pública para quem tiver o link.</p>
            </div>
          </form>
          {!card && error ? <p className="error-message">{error}</p> : null}
        </section>

        <section className="editor" ref={editorRef} aria-labelledby="editor-title">
          <div className="editor-intro">
            <p>Editor</p>
            <h2 id="editor-title">Deixe o cartão do seu jeito.</h2>
            <p>Clique no texto para escrever. Os controles mudam a foto e a cor na hora.</p>
          </div>

          {card ? (
            <div className="editor-workspace">
              <div className="editor-preview" aria-live="polite">
                <HoloCard
                  manifest={card.manifest}
                  photoUrl={card.photoUrl}
                  editable
                  onFieldChange={updateTextField}
                  onEditStart={() => setIsDirty(true)}
                  onPhotoPositionChange={(x, y) =>
                    updateManifest({ photoPositionX: x, photoPositionY: y })
                  }
                  className="editor-holocard"
                />
                <p>Clique diretamente no título, na mensagem ou na assinatura para editar.</p>
              </div>

              <aside className="editor-controls" aria-label="Controles do cartão">
                <div className="editor-savebar">
                  <label className="template-select">
                    <span>Modelo</span>
                    <select
                      value={card.manifest.template}
                      aria-label="Modelo do cartão"
                      onChange={(event) =>
                        updateManifest({
                          template: event.target.value as CardManifest["template"],
                        })
                      }
                    >
                      {CARD_TEMPLATES.map((template) => (
                        <option key={template} value={template}>
                          {TEMPLATE_LABELS[template]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={saveCard}
                    disabled={!isDirty || busy !== null}
                  >
                    {busy === "save" ? "Salvando…" : "Salvar mudanças"}
                  </button>
                </div>

                <div className="visual-control-grid">
                <div className="control-group">
                  <div className="control-label">
                    <span>Altura da foto</span>
                    <output>{card.manifest.photoHeight}%</output>
                  </div>
                  <input
                    className="photo-height-control"
                    type="range"
                    min="42"
                    max="68"
                    step="1"
                    value={card.manifest.photoHeight}
                    onChange={(event) => updateManifest({ photoHeight: Number(event.target.value) })}
                  />
                  <div className="photo-position-actions">
                    <small>Arraste a foto no cartão para reposicionar.</small>
                    <button
                      type="button"
                      onClick={() => updateManifest({ photoPositionX: 50, photoPositionY: 50 })}
                    >
                      Centralizar
                    </button>
                  </div>
                </div>

                <div className="control-group">
                  <span className="control-title">Cor do cartão</span>
                  <div className="theme-swatches" role="radiogroup" aria-label="Cor do cartão">
                      {CARD_ACCENTS.filter((accent) => accent !== "custom").map((accent) => (
                      <label
                        key={accent}
                        className="theme-swatch"
                        data-accent={accent}
                        data-selected={card.manifest.accent === accent}
                      >
                        <input
                          className="theme-radio"
                          type="radio"
                          name="card-theme"
                          value={accent}
                          checked={card.manifest.accent === accent}
                          onChange={() => updateManifest({ accent })}
                        />
                        <span className="sr-only">{THEME_LABELS[accent]}</span>
                      </label>
                    ))}
                      <label
                        className="custom-color-picker"
                        data-selected={card.manifest.accent === "custom"}
                        title="Cor personalizada"
                      >
                        <input
                          type="color"
                          value={card.manifest.customColor}
                          aria-label="Cor personalizada"
                          onChange={(event) =>
                            updateManifest({
                              accent: "custom",
                              customColor: event.target.value,
                            })
                          }
                        />
                        <span aria-hidden="true">+</span>
                      </label>
                  </div>
                </div>
                </div>

                <div className="visual-control-grid">
                <div className="control-group">
                  <span className="control-title">Borda</span>
                  <div className="visual-options" role="radiogroup" aria-label="Borda do cartão">
                    {CARD_FRAMES.map((frame) => (
                      <label
                        key={frame}
                        className="visual-option"
                        data-selected={card.manifest.frame === frame}
                      >
                        <input
                          className="theme-radio"
                          type="radio"
                          name="card-frame"
                          value={frame}
                          checked={card.manifest.frame === frame}
                          onChange={() => updateManifest({ frame })}
                        />
                        <span className="frame-preview" data-frame={frame} aria-hidden="true" />
                        <span>{FRAME_LABELS[frame]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <span className="control-title">Padrão do fundo</span>
                  <div className="visual-options" role="radiogroup" aria-label="Padrão do fundo">
                    {CARD_PATTERNS.map((pattern) => (
                      <label
                        key={pattern}
                        className="visual-option"
                        data-selected={card.manifest.pattern === pattern}
                      >
                        <input
                          className="theme-radio"
                          type="radio"
                          name="card-pattern"
                          value={pattern}
                          checked={card.manifest.pattern === pattern}
                          onChange={() => updateManifest({ pattern })}
                        />
                        <span className="pattern-preview" data-pattern={pattern} aria-hidden="true" />
                        <span>{PATTERN_LABELS[pattern]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                </div>

                <div className="control-group publish-controls">
                  <span className="control-title">Link publicado</span>
                  {isEditingSlug ? (
                    <form className="slug-editor" onSubmit={saveSlug}>
                      <label>
                        <span>holocard.page/</span>
                        <input
                          ref={slugInputRef}
                          value={slugDraft}
                          maxLength={100}
                          aria-label="Parte editável da URL"
                          onChange={(event) => setSlugDraft(event.target.value)}
                        />
                      </label>
                      <div>
                        <button type="submit" disabled={busy !== null || !slugDraft.trim()}>
                          {busy === "slug" ? "Salvando…" : "Salvar URL"}
                        </button>
                        <button
                          className="slug-cancel"
                          type="button"
                          onClick={() => setIsEditingSlug(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="published-url-row">
                      <a href={card.url} target="_blank" rel="noreferrer">
                        {card.url.replace(/^https?:\/\//, "")}
                      </a>
                      <button
                        className="slug-edit-button"
                        type="button"
                        aria-label="Editar URL"
                        onClick={() => {
                          setSlugDraft(card.slug);
                          setIsEditingSlug(true);
                        }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m4 16.5-.8 4.3 4.3-.8L18.8 8.7l-3.5-3.5L4 16.5Zm13-13 3.5 3.5 1.1-1.1a1.7 1.7 0 0 0 0-2.4l-1.1-1.1a1.7 1.7 0 0 0-2.4 0L17 3.5Z" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(card.url);
                      setAnnouncement("Link copiado.");
                    }}
                  >
                    Copiar link
                  </button>
                </div>

                <details className="editor-disclosure">
                  <summary>
                    <span>Reescrever com IA</span>
                    <small>{2 - card.revisionCount} restantes</small>
                  </summary>
                <form className="revision" onSubmit={reviseCard}>
                  <label>
                    <span>O que você quer mudar?</span>
                    <input
                      value={revisionPrompt}
                      maxLength={400}
                      disabled={card.revisionCount >= 2}
                      placeholder="Ex.: deixa mais carinhoso e encurta o título"
                      onChange={(event) => setRevisionPrompt(event.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy !== null || card.revisionCount >= 2 || revisionPrompt.length < 4}
                  >
                    {busy === "revise" ? "Ajustando…" : `Usar revisão (${2 - card.revisionCount})`}
                  </button>
                </form>
                </details>

                <details className="editor-disclosure">
                  <summary>Senha de edição</summary>
                <form className="revision password-control" onSubmit={saveEditorPassword}>
                  <label>
                    <span>Nova senha</span>
                    <input
                      type="password"
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      placeholder="Nova senha, mínimo de 8 caracteres"
                      value={editorPassword}
                      onChange={(event) => setEditorPassword(event.target.value)}
                    />
                  </label>
                  <small>Use essa senha para reabrir o editor em outro aparelho.</small>
                  <button
                    type="submit"
                    disabled={busy !== null || editorPassword.length < 8}
                  >
                    {busy === "password" ? "Salvando…" : "Salvar senha"}
                  </button>
                </form>
                </details>

                <button className="delete-button" type="button" onClick={deleteCard} disabled={busy !== null}>
                  {busy === "delete" ? "Apagando…" : "Apagar cartão e foto"}
                </button>
              </aside>
            </div>
          ) : (
            <div className="editor-empty">
              <div className="empty-shine" aria-hidden="true" />
              <strong>O editor abre depois que você criar o cartão.</strong>
              <p>A prévia grande e os controles vão aparecer neste espaço.</p>
            </div>
          )}
          {card && error ? <p className="error-message">{error}</p> : null}
          <p className="sr-only" aria-live="polite">
            {announcement}
          </p>
        </section>

        <section className="open-source">
          <p>Código aberto</p>
          <h2>O código do cartão é open source.</h2>
          <p>
            Os modelos, o gerador e as instruções para agentes ficam no repositório. Dá para criar
            um HTML no seu computador sem enviar a foto para o holocard.
          </p>
          <a href="https://github.com/decocms/holocard" target="_blank" rel="noreferrer">
            Abrir no GitHub
          </a>
        </section>
      </main>

      <footer>
        <span className="brand-mark">
          holocard <span>✦</span>
        </span>
        <a href="https://poke-holo.simey.me/" target="_blank" rel="noreferrer">
          Efeito baseado no trabalho de poke-holo
        </a>
      </footer>
    </>
  );
}

interface ApiPayload {
  error?: string;
  card?: unknown;
  deleted?: boolean;
}

async function readJson(response: Response): Promise<ApiPayload> {
  return (await response.json().catch(() => ({}))) as ApiPayload;
}

async function optimizePhoto(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Use uma imagem JPG, PNG ou WebP.");
  }
  if (file.size > 8 * 1024 * 1024) throw new Error("A foto deve ter no máximo 8 MB.");
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Seu navegador não conseguiu processar a foto.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) throw new Error("Não foi possível otimizar a foto.");
  return blob;
}

async function createSocialPreview(photo: Blob, manifest: CardManifest): Promise<Blob> {
  const bitmap = await createImageBitmap(photo);
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");

  const [startColor, endColor] =
    manifest.accent === "custom"
      ? [manifest.customColor, darkenHex(manifest.customColor, 0.48)]
      : SOCIAL_THEME_COLORS[manifest.accent];
  const gradient = context.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, endColor);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1200, 630);

  roundedRect(context, 70, 55, 1060, 520, 40);
  context.fillStyle = "white";
  context.fill();

  roundedRect(context, 100, 85, 470, 460, 28);
  context.save();
  context.clip();
  drawCover(
    context,
    bitmap,
    100,
    85,
    470,
    460,
    manifest.photoPositionX,
    manifest.photoPositionY,
  );
  context.restore();

  context.fillStyle = "oklch(0.43 0.06 345)";
  context.font = "700 24px system-ui";
  context.fillText(manifest.occasion, 625, 140, 430);
  context.fillStyle = "oklch(0.18 0.025 345)";
  context.font = "700 58px system-ui";
  const titleY = drawWrapped(context, manifest.title, 625, 220, 430, 64, 2);
  context.fillStyle = "oklch(0.29 0.035 345)";
  context.font = "32px system-ui";
  drawWrapped(context, manifest.message, 625, titleY + 58, 430, 42, 4);
  context.fillStyle = "oklch(0.38 0.07 345)";
  context.font = "700 25px system-ui";
  context.fillText(manifest.signature || "holocard ✦", 625, 510, 430);

  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob) throw new Error("Could not render social image");
  return blob;
}

async function uploadSocialPreview(card: CreatedCard, photo: Blob): Promise<void> {
  const social = await createSocialPreview(photo, card.manifest);
  const response = await fetch(`/api/cards/${card.id}/social`, {
    method: "PUT",
    headers: { "x-edit-token": card.editToken, "content-type": "image/jpeg" },
    body: social,
  });
  if (!response.ok) throw new Error("Could not upload social preview");
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: ImageBitmap,
  x: number,
  y: number,
  width: number,
  height: number,
  positionX = 50,
  positionY = 50,
) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawnWidth = image.width * scale;
  const drawnHeight = image.height * scale;
  context.drawImage(
    image,
    x + (width - drawnWidth) * (positionX / 100),
    y + (height - drawnHeight) * (positionY / 100),
    drawnWidth,
    drawnHeight,
  );
}

function drawWrapped(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) visible[maxLines - 1] = `${visible[maxLines - 1].replace(/[.,;:!?]?$/, "")}…`;
  visible.forEach((value, index) => {
    context.fillText(value, x, y + index * lineHeight, maxWidth);
  });
  return y + Math.max(0, visible.length - 1) * lineHeight;
}

function darkenHex(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((value >> shift) & 0xff) * (1 - amount));
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`;
}
