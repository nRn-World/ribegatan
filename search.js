// ================================================
// RIBE SAMFÄLLIGHETSFÖRENING - Fullständig sökning
// Söker igenom VARJE TEXT i hela sidans HTML
// ================================================

(function () {
    'use strict';

    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    if (!searchInput || !searchResults) return;

    let searchTimeout = null;

    function normalizeText(input) {
        const str = String(input || '').toLowerCase();
        try {
            return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        } catch (_) {
            return str;
        }
    }

    function squashForSearch(normalizedText) {
        return String(normalizedText || '').replace(/[^a-z0-9]+/g, '');
    }

    function tokenizeQuery(query) {
        return normalizeText(query)
            .split(/\s+/g)
            .map(t => t.trim())
            .filter(t => t.length >= 2);
    }

    function matchesAllTerms(normalizedHaystack, terms) {
        const squashedHaystack = squashForSearch(normalizedHaystack);
        return terms.every(term => {
            const t = normalizeText(term);
            if (!t) return true;
            if (normalizedHaystack.includes(t)) return true;
            const st = squashForSearch(t);
            if (!st) return true;
            return squashedHaystack.includes(st);
        });
    }

    // =============================================
    // BYGG INDEX AV HELA SIDANS TEXT
    // =============================================
    function buildFullIndex() {
        const index = [];

        // Samla alla section[id] och deras texter
        const sections = document.querySelectorAll('section[id]');
        sections.forEach(section => {
            const id = section.id;
            const heading = section.querySelector('h1, h2, h3, h4');
            const title = heading ? heading.textContent.trim() : id;

            // Hämta ALL text från sektionen
            // textContent fungerar även för dolda element, innerText bara för synliga
            const rawText = getAllText(section);

            // Dela upp texten i meningsfragment för bättre matchning
            const chunks = splitIntoChunks(rawText);

            chunks.forEach(chunk => {
                if (chunk.trim().length > 3) {
                    index.push({
                        chunk: chunk.trim(),
                        sectionId: id,
                        sectionTitle: title
                    });
                }
            });
        });

        // Indexera också alla divs/artiklar med ID som inte är direkt i en section
        const idElements = document.querySelectorAll('[id]:not(section)');
        idElements.forEach(el => {
            const id = el.id;
            if (!id || id.startsWith('search') || id.startsWith('nav') || id.startsWith('modal')) return;

            const parentSection = el.closest('section[id]');
            if (parentSection) return; // Hanteras redan ovan

            const heading = el.querySelector('h1, h2, h3, h4, h5') || el;
            const title = heading ? heading.textContent.trim().substring(0, 60) : id;
            const rawText = getAllText(el);
            const chunks = splitIntoChunks(rawText);

            chunks.forEach(chunk => {
                if (chunk.trim().length > 3) {
                    index.push({
                        chunk: chunk.trim(),
                        sectionId: id,
                        sectionTitle: title
                    });
                }
            });
        });

        return index;
    }

    // Hämta all text, inklusive hidden element (via textContent)
    function getAllText(el) {
        // Klon för att ta bort script/style
        const clone = el.cloneNode(true);
        clone.querySelectorAll('script, style, noscript, svg, button').forEach(e => e.remove());
        // Använd textContent för att fånga ALL text (inkl. dolda element)
        return (clone.textContent || '').replace(/\s+/g, ' ').trim();
    }

    // Dela text i hanterbara bitar (meningar/fraser)
    function splitIntoChunks(text) {
        // Dela vid punkt, ny rad, semikolon etc.
        return text
            .split(/[.\n\r;|]+/)
            .map(s => s.trim())
            .filter(s => s.length > 2);
    }

    // =============================================
    // SÖK-LOGIK - Aggregerar resultat per sektion
    // =============================================
    function performSearch(query) {
        const q = String(query || '').trim();
        const terms = tokenizeQuery(q);
        if (terms.length === 0) {
            hideResults();
            return;
        }

        // Sök igenom varje sektion direkt i DOM (mest pålitlig metod)
        const sectionResults = [];
        const seenIds = new Set();

        document.querySelectorAll('section[id]').forEach(section => {
            const id = section.id;
            if (seenIds.has(id)) return;

            // textContent fångar ALL text oavsett synlighet
            const fullText = section.textContent || '';
            const lowerText = normalizeText(fullText);

            const isMatch = matchesAllTerms(lowerText, terms);
            if (isMatch) {
                const heading = section.querySelector('h1, h2, h3');
                const title = heading ? heading.textContent.trim() : id;
                const snippet = buildSnippet(fullText, terms[0]);
                const score = terms.reduce((sum, t) => sum + countOccurrences(lowerText, t), 0);

                sectionResults.push({ id, title, snippet, score });
                seenIds.add(id);
            }
        });

        // Sök även i divs med ID som inte ligger i sections (t.ex. boappa, grannsamverkan)
        document.querySelectorAll('[id]:not(section)').forEach(el => {
            const id = el.id;
            if (!id || seenIds.has(id)) return;
            if (id === 'searchInput' || id === 'searchResults') return;

            // Kolla om den har en sektion-parent som redan hittades
            const parentSection = el.closest('section[id]');
            if (parentSection && seenIds.has(parentSection.id)) return;

            const fullText = el.textContent || '';
            const lowerText = normalizeText(fullText);

            const isMatch = matchesAllTerms(lowerText, terms);
            if (isMatch) {
                const targetId = parentSection ? parentSection.id : id;
                if (seenIds.has(targetId)) return;

                const heading = (parentSection || el).querySelector('h1, h2, h3') || el;
                const title = heading ? heading.textContent.trim().substring(0, 60) : id;
                const snippet = buildSnippet(fullText, terms[0]);
                const score = terms.reduce((sum, t) => sum + countOccurrences(lowerText, t), 0);

                sectionResults.push({ id: targetId, title, snippet, score });
                seenIds.add(targetId);
            }
        });

        // Sortera: fler träffar = högre upp
        sectionResults.sort((a, b) => b.score - a.score);

        displayResults(sectionResults, q);
    }

    // =============================================
    // HJÄLPFUNKTIONER
    // =============================================

    function countOccurrences(text, query) {
        let count = 0;
        let pos = 0;
        while ((pos = text.indexOf(query, pos)) !== -1) {
            count++;
            pos += query.length;
        }
        return count;
    }

    function buildSnippet(text, queryTerm) {
        const cleaned = text.replace(/\s+/g, ' ').trim();
        const lowerText = normalizeText(cleaned);
        const lowerQ = normalizeText(queryTerm);
        const idx = lowerText.indexOf(lowerQ);

        if (idx === -1) {
            return cleaned.substring(0, 130) + '...';
        }

        const start = Math.max(0, idx - 70);
        const end = Math.min(cleaned.length, idx + queryTerm.length + 90);
        let snippet = cleaned.substring(start, end);

        if (start > 0) snippet = '…' + snippet;
        if (end < cleaned.length) snippet = snippet + '…';

        return snippet;
    }

    function highlight(text, query) {
        if (!text || !query) return text;
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
            return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
        } catch (e) {
            return text;
        }
    }

    // =============================================
    // VISA RESULTAT
    // =============================================
    function displayResults(results, query) {
        searchResults.innerHTML = '';

        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search" style="margin-right:0.5rem;opacity:0.5;"></i>
                    Ingen träff på "<strong>${escapeHtml(query)}</strong>" — prøv kortare sökord
                </div>`;
            searchResults.classList.add('active');
            return;
        }

        const toShow = results.slice(0, 25);

        toShow.forEach(result => {
            const div = document.createElement('div');
            div.className = 'search-result-item';

            div.innerHTML = `
                <div class="search-result-title">${highlight(escapeHtml(result.title), query)}</div>
                <div class="search-result-snippet">${highlight(escapeHtml(result.snippet), query)}</div>
            `;

            div.addEventListener('click', () => {
                scrollToSection(result.id);
                hideResults();
                searchInput.value = '';
                searchInput.blur();
            });

            searchResults.appendChild(div);
        });

        searchResults.classList.add('active');
    }

    function escapeHtml(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function scrollToSection(id) {
        // First reveal the section if it is hidden (homepage shortening logic)
        // Check if revealSection exists in the global scope (defined in index.html)
        if (typeof window.revealSection === 'function') {
            window.revealSection(id);
        }

        const target = document.getElementById(id);
        if (!target) return;

        // Give the revelation a tiny bit of time if needed, though direct call is sync
        const navbar = document.querySelector('.navbar');
        const navbarHeight = navbar ? navbar.offsetHeight + 10 : 90;
        const top = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;

        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }

    function hideResults() {
        searchResults.classList.remove('active');
        searchResults.innerHTML = '';
    }

    // =============================================
    // EVENT LISTENERS
    // =============================================
    searchInput.addEventListener('input', e => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => performSearch(e.target.value), 250);
    });

    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const first = searchResults.querySelector('.search-result-item');
            if (first) first.click();
        }
        if (e.key === 'Escape') hideResults();
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.search-container')) hideResults();
    });

    searchResults.addEventListener('click', e => e.stopPropagation());

})();
