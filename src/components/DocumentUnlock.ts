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

const makeTextElement = (tagName: "h2" | "h3" | "p", text: string): HTMLElement => {
  const element = document.createElement(tagName);
  element.textContent = text;
  return element;
};

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
      if (claims.Valkyrja !== account || claims.password !== password || claims.admin !== true) {
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
    heading.append(makeTextElement("h2", title));
    if (title2) heading.append(makeTextElement("h3", title2));

    const newsEntries = Object.entries(claims)
      .filter((entry): entry is [string, string] =>
        /^news\d+$/.test(entry[0]) && typeof entry[1] === "string")
      .sort(([left], [right]) => Number(left.slice(4)) - Number(right.slice(4)));
    const news = document.createElement("div");
    news.className = "document-unlocked-news";
    newsEntries.forEach(([, value], index) => {
      const entry = document.createElement("section");
      entry.className = "document-unlocked-entry";
      entry.append(makeTextElement("h3", `檔案 ${String(index + 1).padStart(2, "0")}`));
      entry.append(makeTextElement("p", value));
      news.append(entry);
    });

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

    this.documentPanel.replaceChildren(heading, news, logout);
  }
}
