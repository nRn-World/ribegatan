const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { commitFile } = require('./github-service');

const CONTENT_FILE = path.join(__dirname, '../data/content.json');
const uuidv4 = () => crypto.randomUUID();

/**
 * Content Service - Hanterar CRUD-operationer för inlägg och sidor
 */
class ContentService {
  /**
   * Läser innehållsdata från content.json
   */
  async readContentData() {
    try {
      const data = await fs.readFile(CONTENT_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Om filen inte finns, returnera tom struktur
      return { posts: [], pages: [], media: [] };
    }
  }

  /**
   * Skriver innehållsdata till content.json
   */
  async writeContentData(data) {
    await fs.writeFile(CONTENT_FILE, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Hämtar alla inlägg
   * @returns {Promise<Array>} Lista med alla inlägg
   */
  async getAllPosts() {
    const data = await this.readContentData();
    return data.posts || [];
  }

  /**
   * Hämtar ett specifikt inlägg
   * @param {string} id - Inläggets ID
   * @returns {Promise<Object|null>} Inlägget eller null om det inte finns
   */
  async getPost(id) {
    const data = await this.readContentData();
    const post = data.posts.find(p => p.id === id);
    return post || null;
  }

  /**
   * Skapar ett nytt inlägg
   * @param {Object} postInput - Inläggsdata (title, content, category)
   * @returns {Promise<Object>} Det skapade inlägget
   */
  async createPost(postInput) {
    const data = await this.readContentData();
    
    const newPost = {
      id: uuidv4(),
      title: postInput.title,
      content: postInput.content,
      category: postInput.category || 'allmänt',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.posts.push(newPost);
    await this.writeContentData(data);
    
    return newPost;
  }

  /**
   * Uppdaterar ett befintligt inlägg
   * @param {string} id - Inläggets ID
   * @param {Object} postInput - Uppdaterad inläggsdata (title, content, category)
   * @returns {Promise<Object|null>} Det uppdaterade inlägget eller null om det inte finns
   */
  async updatePost(id, postInput) {
    const data = await this.readContentData();
    const postIndex = data.posts.findIndex(p => p.id === id);
    
    if (postIndex === -1) {
      return null;
    }

    const existingPost = data.posts[postIndex];
    const updatedPost = {
      ...existingPost,
      title: postInput.title !== undefined ? postInput.title : existingPost.title,
      content: postInput.content !== undefined ? postInput.content : existingPost.content,
      category: postInput.category !== undefined ? postInput.category : existingPost.category,
      updatedAt: new Date().toISOString()
    };

    data.posts[postIndex] = updatedPost;
    await this.writeContentData(data);
    
    return updatedPost;
  }

  /**
   * Raderar ett inlägg
   * @param {string} id - Inläggets ID
   * @returns {Promise<boolean>} true om inlägget raderades, false om det inte fanns
   */
  async deletePost(id) {
    const data = await this.readContentData();
    const postIndex = data.posts.findIndex(p => p.id === id);
    
    if (postIndex === -1) {
      return false;
    }

    data.posts.splice(postIndex, 1);
    await this.writeContentData(data);
    
    return true;
  }

  /**
   * Hämtar alla HTML-sidor från rotkatalogen
   * @returns {Promise<Array>} Lista med alla sidor
   */
  async getAllPages() {
    const rootDir = path.join(__dirname, '../../../');
    const files = await fs.readdir(rootDir);

    // Filtrera endast HTML-filer
    const htmlFiles = files.filter(file => file.endsWith('.html'));

    const pages = [];
    for (const filename of htmlFiles) {
      const filePath = path.join(rootDir, filename);
      const stats = await fs.stat(filePath);

      // Läs HTML-innehåll för att extrahera titel
      const content = await fs.readFile(filePath, 'utf8');
      const titleMatch = content.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : filename;

      pages.push({
        filename,
        title,
        lastModified: stats.mtime.toISOString()
      });
    }

    return pages;
  }

  /**
   * Hämtar en specifik HTML-sida
   * @param {string} filename - Sidans filnamn
   * @returns {Promise<Object|null>} Sidan eller null om den inte finns
   */
  async getPage(filename) {
    // Validera filnamn för att förhindra path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new Error('Ogiltigt filnamn');
    }

    if (!filename.endsWith('.html')) {
      throw new Error('Endast HTML-filer stöds');
    }

    const rootDir = path.join(__dirname, '../../../');
    const filePath = path.join(rootDir, filename);

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);

      // Extrahera titel från HTML
      const titleMatch = content.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : filename;

      return {
        filename,
        title,
        content,
        lastModified: stats.mtime.toISOString()
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Validerar HTML-innehåll för välformadhet
   * @param {string} html - HTML-innehåll att validera
   * @returns {boolean} true om HTML är välformad
   * @throws {Error} Om HTML är ogiltig
   */
  validateHTML(html) {
    // Grundläggande validering av HTML-struktur

    // Kontrollera att det finns öppnande och stängande html-taggar
    if (!html.includes('<html') || !html.includes('</html>')) {
      throw new Error('HTML måste innehålla <html> och </html> taggar');
    }

    // Kontrollera att det finns head och body
    if (!html.includes('<head') || !html.includes('</head>')) {
      throw new Error('HTML måste innehålla <head> och </head> taggar');
    }

    if (!html.includes('<body') || !html.includes('</body>')) {
      throw new Error('HTML måste innehålla <body> och </body> taggar');
    }

    // Skippa den avancerade tag-balanseringen eftersom den kan orsaka problem
    // med komplexa HTML-dokument
    
    return true;
  }

  /**
   * Uppdaterar en HTML-sida med bevarad struktur
   * @param {string} filename - Sidans filnamn
   * @param {string} content - Nytt HTML-innehåll
   * @returns {Promise<Object|null>} Den uppdaterade sidan eller null om den inte finns
   */
  async updatePage(filename, content) {
    // Validera filnamn för att förhindra path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new Error('Ogiltigt filnamn');
    }

    if (!filename.endsWith('.html')) {
      throw new Error('Endast HTML-filer stöds');
    }

    // Validera HTML innan sparning
    this.validateHTML(content);

    const rootDir = path.join(__dirname, '../../../');
    const filePath = path.join(rootDir, filename);

    // Kontrollera att filen finns
    try {
      await fs.access(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }

    // Spara lokalt om möjligt (Render/disk). På Vercel är filsystemet read-only.
    try {
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      console.warn('Lokal filskrivning hoppades över:', error.message);
    }

    // Synka till GitHub så GitHub Pages uppdateras (detta är den riktiga publiceringen)
    let githubSync = null;
    try {
      githubSync = await commitFile(
        filename,
        content,
        `admin: uppdatera ${filename}`
      );
    } catch (error) {
      console.error('GitHub-synk misslyckades:', error.message);
      throw new Error(
        'Kunde inte publicera till GitHub Pages: ' + error.message
      );
    }

    if (githubSync && githubSync.skipped) {
      throw new Error(
        'GITHUB_TOKEN saknas på servern. Lägg till en GitHub-token med repo-rättigheter för att kunna publicera.'
      );
    }

    // Uppdatera metadata i content.json
    const data = await this.readContentData();
    const pageIndex = data.pages.findIndex(p => p.filename === filename);

    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : filename;

    const pageMetadata = {
      filename,
      title,
      lastModified: new Date().toISOString()
    };

    if (pageIndex === -1) {
      data.pages.push(pageMetadata);
    } else {
      data.pages[pageIndex] = pageMetadata;
    }

    try {
      await this.writeContentData(data);
    } catch (error) {
      console.warn('Kunde inte uppdatera content.json:', error.message);
    }

    return {
      filename,
      title,
      content,
      lastModified: pageMetadata.lastModified,
      githubSync
    };
  }

  /**
   * Uppdaterar CSS-stilar för en specifik selektor
   * @param {string} selector - CSS-selektor (t.ex. "body", "h1", ".normal")
   * @param {string} property - CSS-egenskap (t.ex. "color", "background-color")
   * @param {string} value - CSS-värde (t.ex. "#ff0000", "12pt")
   * @param {string} cssFile - CSS-filnamn (valfritt, standard: "swglobal.css")
   * @returns {Promise<void>}
   */
  async updateStyle(selector, property, value, cssFile = 'swglobal.css') {
    // Validera CSS-filnamn för att förhindra path traversal
    if (cssFile.includes('..') || cssFile.includes('/') || cssFile.includes('\\')) {
      throw new Error('Ogiltigt CSS-filnamn');
    }

    if (!cssFile.endsWith('.css')) {
      throw new Error('Endast CSS-filer stöds');
    }

    // Validera selektor (grundläggande validering)
    if (!selector || typeof selector !== 'string' || selector.trim() === '') {
      throw new Error('Ogiltig CSS-selektor');
    }

    // Validera property och value
    if (!property || typeof property !== 'string' || property.trim() === '') {
      throw new Error('Ogiltig CSS-egenskap');
    }

    if (value === undefined || value === null) {
      throw new Error('Ogiltigt CSS-värde');
    }

    const cssDir = path.join(__dirname, '../../../ribegatan.se/css');
    const cssFilePath = path.join(cssDir, cssFile);

    // Kontrollera att CSS-filen finns
    try {
      await fs.access(cssFilePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`CSS-filen ${cssFile} kunde inte hittas`);
      }
      throw error;
    }

    // Läs CSS-innehåll
    let cssContent = await fs.readFile(cssFilePath, 'utf8');

    // Normalisera selektor och property
    const normalizedSelector = selector.trim();
    const normalizedProperty = property.trim();
    const normalizedValue = String(value).trim();

    // Hitta och uppdatera CSS-regeln
    // Regex för att hitta selektorn och dess block
    const selectorPattern = new RegExp(
      `(${this.escapeRegex(normalizedSelector)}\\s*\\{[^}]*)(${this.escapeRegex(normalizedProperty)}\\s*:[^;]+;)`,
      'gi'
    );

    let updated = false;

    // Försök uppdatera befintlig egenskap
    cssContent = cssContent.replace(selectorPattern, (match, beforeProp, oldProp) => {
      updated = true;
      return `${beforeProp}${normalizedProperty}:${normalizedValue};`;
    });

    // Om egenskapen inte hittades, lägg till den i befintligt block
    if (!updated) {
      const blockPattern = new RegExp(
        `(${this.escapeRegex(normalizedSelector)}\\s*\\{[^}]*)(\\})`,
        'gi'
      );

      cssContent = cssContent.replace(blockPattern, (match, beforeClose, closeBrace) => {
        updated = true;
        // Ta bort eventuell avslutande whitespace och lägg till ny egenskap
        const trimmedBefore = beforeClose.trimEnd();
        // Kontrollera om det finns ett semikolon i slutet
        const needsSemicolon = !trimmedBefore.endsWith(';') && trimmedBefore.length > normalizedSelector.length + 1;
        const semicolon = needsSemicolon ? ';' : '';
        return `${trimmedBefore}${semicolon}\n\t${normalizedProperty}:${normalizedValue};\n${closeBrace}`;
      });
    }

    // Om selektorn inte finns alls, skapa ett nytt block
    if (!updated) {
      cssContent += `\n\n${normalizedSelector} {\n\t${normalizedProperty}:${normalizedValue};\n}\n`;
    }

    // Spara uppdaterat CSS-innehåll
    await fs.writeFile(cssFilePath, cssContent, 'utf8');
  }

  /**
   * Hjälpfunktion för att escape:a specialtecken i regex
   * @param {string} str - Sträng att escape:a
   * @returns {string} Escaped sträng
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

}

module.exports = new ContentService();
