type JwtClaims = Record<string, unknown>;

const decodeBase64UrlJson = (value: string): unknown => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(paddedBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const makeTextElement = (tagName: "h2" | "h3" | "h4" | "p" | "strong", text: string): HTMLElement => {
  const element = document.createElement(tagName);
  element.textContent = text;
  return element;
};

const valueToText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(valueToText).join("、");
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, entry]) => `${key}：${valueToText(entry)}`)
      .join("；");
  }
  return "";
};

const appendField = (parent: HTMLElement, label: string, value: unknown): void => {
  if (value === undefined || value === null || value === "") return;
  const row = document.createElement("p");
  row.className = "document-unlocked-field";
  const name = document.createElement("strong");
  name.textContent = `${label}：`;
  row.append(name, document.createTextNode(valueToText(value)));
  parent.append(row);
};

const makeSection = (title: string, className: string): HTMLElement => {
  const section = document.createElement("section");
  section.className = `document-unlocked-section ${className}`;
  section.append(makeTextElement("h3", title));
  return section;
};

const toRecordArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

export class DocumentUnlock {
  private readonly form: HTMLFormElement;
  private readonly tokenInput: HTMLTextAreaElement;
  private readonly accountInput: HTMLInputElement;
  private readonly passwordInput: HTMLInputElement;
  private readonly status: HTMLElement;
  private readonly documentPanel: HTMLElement;

  constructor(private readonly root: HTMLElement) {
    this.root.innerHTML = `
      <section class="document-unlock-card">
        <div class="document-unlock-heading">
          <div>
            <span class="eyebrow">FATE SYSTEM · SEALED ARCHIVE</span>
            <h2>命定系統封存檔案</h2>
            <p>唯有持有正確識別印記之人，方可閱覽此處紀錄。</p>
          </div>
          <span class="document-unlock-badge">權限封鎖</span>
        </div>
        <form class="document-unlock-form">
          <label class="document-unlock-field">
            <span>封存密文</span>
            <textarea name="token" rows="4" required autocomplete="off" spellcheck="false" placeholder="輸入封存密文"></textarea>
          </label>
          <div class="document-unlock-credentials">
            <label class="document-unlock-field">
              <span>識別代號</span>
              <input name="account" type="text" required autocomplete="username" placeholder="輸入識別代號" />
            </label>
            <label class="document-unlock-field">
              <span>通行密語</span>
              <input name="password" type="password" required autocomplete="current-password" placeholder="輸入通行密語" />
            </label>
          </div>
          <div class="document-unlock-actions">
            <button class="document-unlock-submit" type="submit">嘗試解封</button>
            <p class="document-unlock-status" role="status" aria-live="polite">封存檔案等待識別。</p>
          </div>
        </form>
        <article class="document-unlocked" hidden aria-live="polite"></article>
      </section>
    `;

    const form = this.root.querySelector<HTMLFormElement>(".document-unlock-form");
    const tokenInput = this.root.querySelector<HTMLTextAreaElement>('[name="token"]');
    const accountInput = this.root.querySelector<HTMLInputElement>('[name="account"]');
    const passwordInput = this.root.querySelector<HTMLInputElement>('[name="password"]');
    const status = this.root.querySelector<HTMLElement>(".document-unlock-status");
    const documentPanel = this.root.querySelector<HTMLElement>(".document-unlocked");
    if (!form || !tokenInput || !accountInput || !passwordInput || !status || !documentPanel) {
      throw new Error("A required document unlock region is missing.");
    }

    this.form = form;
    this.tokenInput = tokenInput;
    this.accountInput = accountInput;
    this.passwordInput = passwordInput;
    this.status = status;
    this.documentPanel = documentPanel;
    this.form.addEventListener("submit", (event) => this.unlock(event));
  }

  private unlock(event: SubmitEvent): void {
    event.preventDefault();
    this.documentPanel.hidden = true;
    this.documentPanel.replaceChildren();

    try {
      const tokenParts = this.tokenInput.value.trim().split(".");
      if (tokenParts.length !== 3 || tokenParts.some((part) => !part)) {
        throw new Error("封存密文無法辨識，存取遭拒。");
      }

      const header: unknown = decodeBase64UrlJson(tokenParts[0]);
      const claims: unknown = decodeBase64UrlJson(tokenParts[1]);
      if (!isRecord(header) || header.alg !== "HS256" || header.typ !== "JWT") {
        throw new Error("封存密文無法辨識，存取遭拒。");
      }
      if (!isRecord(claims)) {
        throw new Error("封存密文無法辨識，存取遭拒。");
      }

      const account = this.accountInput.value.trim();
      const password = this.passwordInput.value;
      if (claims.Valkyrja !== account || claims.password !== password || typeof claims.admin !== "boolean") {
        throw new Error("識別印記不符，存取遭拒。");
      }

      this.renderDocument(claims);
      this.status.textContent = "封存檔案已解封。";
      this.documentPanel.hidden = false;
    } catch (error) {
      this.status.textContent = error instanceof Error && error.message === "識別印記不符，存取遭拒。"
        ? error.message
        : "封存密文無法辨識，存取遭拒。";
    }
  }

  private renderDocument(claims: JwtClaims): void {
    const title = typeof claims.title === "string" ? claims.title : "未命名文件";
    const title2 = typeof claims.title2 === "string" ? claims.title2 : "";
    const heading = document.createElement("header");
    const archiveLabel = makeTextElement("p", "MOIRA — FATE OBSERVATION ARCHIVE");
    archiveLabel.className = "document-unlocked-archive-label";
    heading.append(archiveLabel);
    heading.append(makeTextElement("h2", title));
    if (title2) heading.append(makeTextElement("h3", title2));

    const content = document.createElement("div");
    content.className = "document-unlocked-content";
    this.renderWorld(content, claims.world);
    this.renderTimeline(content, claims.timeline);
    this.renderNews(content, claims);
    this.renderSecrets(content, claims.secret);
    this.renderFateSystemNotes(content, claims.fateSystemNotes, claims.admin === true);
    this.renderSystemMessages(content, claims.systemMessage, claims.admin === true);
    this.renderMetadata(content, claims.metadata);

    const logout = document.createElement("button");
    logout.className = "document-unlock-logout";
    logout.type = "button";
    logout.textContent = "重新封存";
    logout.addEventListener("click", () => {
      this.documentPanel.hidden = true;
      this.documentPanel.replaceChildren();
      this.passwordInput.value = "";
      this.status.textContent = "封存檔案已重新封存。";
    });

    this.documentPanel.replaceChildren(heading, content, logout);
  }

  private renderWorld(parent: HTMLElement, value: unknown): void {
    if (!isRecord(value)) return;
    const section = makeSection("世界紀錄", "document-unlocked-world");
    const date = value.currentDate ?? value.date;
    appendField(section, "觀測座標", [value.name, date].filter((part) => typeof part === "string" && part).join("｜"));
    appendField(section, "事件編號", value.eventId);
    appendField(section, "干涉狀態", value.interferenceStatus);
    parent.append(section);
  }

  private renderTimeline(parent: HTMLElement, value: unknown): void {
    if (!isRecord(value)) return;
    const title = typeof value.title === "string" ? `【${value.title}】` : "命運軌跡";
    const section = makeSection(title, "document-unlocked-timeline");
    appendField(section, "推演類型", value.type);
    appendField(section, "軌跡狀態", value.status);
    appendField(section, "原始預測時間", value.predictedDate);
    appendField(section, "重新觀測", value.updateStatus);
    if (typeof value.notice === "string") {
      const warning = document.createElement("p");
      warning.className = "document-unlocked-warning";
      warning.append(makeTextElement("strong", "時間軸警告"));
      warning.append(document.createElement("br"), document.createTextNode(value.notice));
      section.append(warning);
    }
    parent.append(section);
  }

  private renderNews(parent: HTMLElement, claims: JwtClaims): void {
    const legacyEntries = Object.entries(claims)
      .filter((entry): entry is [string, string] =>
        /^news\d+$/.test(entry[0]) && typeof entry[1] === "string")
      .sort(([left], [right]) => Number(left.slice(4)) - Number(right.slice(4)));
    const entries = toRecordArray(claims.news).sort((left, right) => {
      const leftId = typeof left.id === "string" ? left.id : "";
      const rightId = typeof right.id === "string" ? right.id : "";
      return leftId.localeCompare(rightId, undefined, { numeric: true });
    });
    const newsSection = makeSection("中層報社新聞", "document-unlocked-news");
    const mappedLegacyFields = new Set<string>();

    if (entries.length > 0) {
      entries.forEach((entry, index) => {
        const card = document.createElement("article");
        card.className = "document-unlocked-entry";
        const legacyField = typeof entry.legacyField === "string" ? entry.legacyField : "";
        if (legacyField) mappedLegacyFields.add(legacyField);
        card.append(makeTextElement(
          "h4",
          `${valueToText(entry.category) || "中層報社"}｜${valueToText(entry.title) || `新聞 ${index + 1}`}${legacyField ? ` · ${legacyField}` : ""}`
        ));
        appendField(card, "刊載時間", entry.time);
        appendField(card, "紀錄性質", entry.recordType);
        const body = entry.content ?? entry.body ?? entry.text;
        if (body !== undefined) card.append(makeTextElement("p", valueToText(body)));
        newsSection.append(card);
      });
    }

    legacyEntries
      .filter(([key]) => !mappedLegacyFields.has(key))
      .forEach(([key, value], index) => {
        const card = document.createElement("article");
        card.className = "document-unlocked-entry";
        card.append(makeTextElement("h4", `中層報社｜舊聞 ${String(index + 1).padStart(2, "0")} · ${key}`));
        card.append(makeTextElement("p", value));
        newsSection.append(card);
      });

    if (entries.length > 0 || legacyEntries.length > 0) parent.append(newsSection);
  }

  private renderSecrets(parent: HTMLElement, value: unknown): void {
    const files = toRecordArray(value);
    if (files.length === 0) return;

    const section = makeSection("機密檔案", "document-unlocked-secrets");
    files.forEach((file, index) => {
      const card = document.createElement("article");
      card.className = "document-unlocked-entry";
      card.append(makeTextElement("h4", `檔案 ${valueToText(file.index) || String(index + 1).padStart(2, "0")}｜${valueToText(file.title) || "未命名檔案"}`));
      appendField(card, "解鎖條件", file.unlockCondition);
      const isUnlocked = file.unlocked === true || file.status === "已解封" || file.status === "unlocked";
      appendField(card, "檔案狀態", isUnlocked ? "已解封" : file.status || "封存");
      if (isUnlocked) {
        appendField(card, "檔案內容", file.content);
      }
      section.append(card);
    });
    parent.append(section);
  }

  private renderFateSystemNotes(parent: HTMLElement, value: unknown, isGm: boolean): void {
    if (!isRecord(value)) return;
    const section = makeSection("命定系統註釋", "document-unlocked-fate-notes");
    appendField(section, "系統註釋", value.notes);
    appendField(section, "未知命刻", value.unknownFateClock);
    if (isRecord(value.displayRules)) {
      appendField(section, "玩家可見", value.displayRules.player);
      if (isGm) appendField(section, "GM 可見", value.displayRules.gm);
    }
    parent.append(section);
  }

  private renderSystemMessages(parent: HTMLElement, value: unknown, isGm: boolean): void {
    if (!isRecord(value)) return;
    const section = makeSection("命定系統訊息", "document-unlocked-system-message");
    appendField(section, "旅人訊息", value.player);
    if (isGm) appendField(section, "GM 記錄", value.gm);
    parent.append(section);
  }

  private renderMetadata(parent: HTMLElement, value: unknown): void {
    if (!isRecord(value)) return;
    const section = makeSection("解密備忘", "document-unlocked-metadata");
    appendField(section, "解密階段", value.decryptionStage);
    appendField(section, "預計揭露", value.plannedReveals);
    appendField(section, "暫不揭露", value.withheldTruths);
    parent.append(section);
  }
}
