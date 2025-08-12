document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const notesList = document.getElementById("notesList");
  const noteTitle = document.getElementById("noteTitle");
  const noteEditor = document.getElementById("noteEditor");
  const newNoteBtn = document.getElementById("newNoteBtn");
  const saveNoteBtn = document.getElementById("saveNoteBtn");
  const deleteNoteBtn = document.getElementById("deleteNoteBtn");
  const searchNotes = document.getElementById("searchNotes");
  const wordCount = document.getElementById("wordCount");
  const charCount = document.getElementById("charCount");
  const lastSaved = document.getElementById("lastSaved");
  const themeToggle = document.getElementById("themeToggle");
  const autocompleteContainer = document.getElementById(
    "autocompleteContainer"
  );
  const autocompleteDropdown = document.getElementById("autocompleteDropdown");

  // State
  let notes = JSON.parse(localStorage.getItem("celestial-notes")) || [];
  let currentNoteId = null;
  let isDarkMode = localStorage.getItem("darkMode") === "true";
  let autocompleteActive = false;
  let autocompletePosition = 0;
  let autocompleteSuggestions = [];

  // Initialize the app
  function init() {
    // Set theme
    setTheme(isDarkMode);

    // Load notes
    renderNotesList();
    if (notes.length > 0) {
      loadNote(notes[0].id);
    } else {
      createNewNote();
    }

    // Set up event listeners
    setupEventListeners();

    // Set up auto-save
    setupAutoSave();

    // Set up autocomplete
    setupAutocomplete();
  }

  // Set theme
  function setTheme(darkMode) {
    isDarkMode = darkMode;
    localStorage.setItem("darkMode", darkMode);

    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }

  // Render the notes list
  function renderNotesList(filter = "") {
    notesList.innerHTML = "";

    const filteredNotes = filter
      ? notes.filter(
          (note) =>
            note.title.toLowerCase().includes(filter.toLowerCase()) ||
            note.content.toLowerCase().includes(filter.toLowerCase())
        )
      : notes;

    if (filteredNotes.length === 0) {
      const emptyState = document.createElement("li");
      emptyState.textContent = "No notes found";
      emptyState.classList.add("empty-state");
      notesList.appendChild(emptyState);
      return;
    }

    filteredNotes.forEach((note) => {
      const li = document.createElement("li");
      li.textContent = note.title || "Untitled Constellation";
      li.dataset.id = note.id;

      if (note.id === currentNoteId) {
        li.classList.add("active");
      }

      // Add creation date tooltip
      const date = new Date(note.createdAt);
      li.title = `Created: ${date.toLocaleString()}`;

      li.addEventListener("click", () => loadNote(note.id));
      notesList.appendChild(li);
    });
  }

  // Load a note into the editor
  function loadNote(id) {
    const note = notes.find((note) => note.id === id);
    if (note) {
      currentNoteId = id;
      noteTitle.value = note.title;
      noteEditor.innerHTML = note.content;
      updateWordCount();
      updateCharCount();
      updateLastSaved(note.updatedAt);
      renderNotesList();

      // Animate transition
      noteEditor.classList.add("animate__animated", "animate__fadeIn");
      setTimeout(() => {
        noteEditor.classList.remove("animate__animated", "animate__fadeIn");
      }, 500);
    }
  }

  // Create a new note
  function createNewNote() {
    const newNote = {
      id: Date.now().toString(),
      title: "",
      content: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    notes.unshift(newNote);
    currentNoteId = newNote.id;
    noteTitle.value = "";
    noteEditor.innerHTML = "";
    saveNotes();
    renderNotesList();
    noteTitle.focus();

    // Show animation
    noteEditor.classList.add("animate__animated", "animate__pulse");
    setTimeout(() => {
      noteEditor.classList.remove("animate__animated", "animate__pulse");
    }, 500);
  }

  // Save the current note
  function saveNote() {
    if (!currentNoteId) return;

    const noteIndex = notes.findIndex((note) => note.id === currentNoteId);
    if (noteIndex !== -1) {
      notes[noteIndex] = {
        ...notes[noteIndex],
        title: noteTitle.value,
        content: noteEditor.innerHTML,
        updatedAt: new Date().toISOString(),
      };

      saveNotes();
      renderNotesList();
      updateLastSaved(notes[noteIndex].updatedAt);

      // Show save animation
      lastSaved.classList.add("animate__animated", "animate__bounceIn");
      setTimeout(() => {
        lastSaved.classList.remove("animate__animated", "animate__bounceIn");
      }, 500);
    }
  }

  // Delete the current note
  function deleteNote() {
    if (!currentNoteId) return;

    // Show confirmation with animation
    deleteNoteBtn.classList.add("animate__animated", "animate__shakeX");
    setTimeout(() => {
      deleteNoteBtn.classList.remove("animate__animated", "animate__shakeX");

      if (confirm("Are you sure you want to delete this constellation?")) {
        notes = notes.filter((note) => note.id !== currentNoteId);
        saveNotes();

        if (notes.length > 0) {
          loadNote(notes[0].id);
        } else {
          createNewNote();
        }

        renderNotesList();
      }
    }, 500);
  }

  // Save all notes to localStorage
  function saveNotes() {
    localStorage.setItem("celestial-notes", JSON.stringify(notes));
  }

  // Update word count
  function updateWordCount() {
    const text = noteEditor.textContent || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;
  }

  // Update character count
  function updateCharCount() {
    const text = noteEditor.textContent || "";
    charCount.textContent = `${text.length} ${
      text.length === 1 ? "character" : "characters"
    }`;
  }

  // Update last saved time
  function updateLastSaved(timestamp) {
    if (!timestamp) {
      lastSaved.innerHTML = '<i class="fas fa-sync-alt"></i> Not saved yet';
      return;
    }

    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    let timeText;
    if (diffInMinutes < 1) {
      timeText = "Saved just now";
    } else if (diffInMinutes < 60) {
      timeText = `Saved ${diffInMinutes} ${
        diffInMinutes === 1 ? "minute" : "minutes"
      } ago`;
    } else {
      timeText = `Saved at ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    lastSaved.innerHTML = `<i class="fas fa-sync-alt"></i> ${timeText}`;
  }

  // Set up auto-save functionality
  function setupAutoSave() {
    let saveTimeout;

    function queueSave() {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveNote, 1500);
    }

    noteTitle.addEventListener("input", queueSave);
    noteEditor.addEventListener("input", queueSave);
    noteEditor.addEventListener("input", updateWordCount);
    noteEditor.addEventListener("input", updateCharCount);
  }

  // Set up autocomplete functionality
  function setupAutocomplete() {
    noteEditor.addEventListener("input", (e) => {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const text = range.startContainer.textContent || "";
      const cursorPos = range.startOffset;

      // Get the current word being typed
      let wordStart = cursorPos;
      while (wordStart > 0 && !/\s/.test(text[wordStart - 1])) {
        wordStart--;
      }

      const currentWord = text.substring(wordStart, cursorPos).toLowerCase();

      // Inside your input event:
      if (currentWord.length >= 2) {
        autocompletePosition = wordStart;

        // First search in habit trie
        let habitMatches = habitTrie.startsWith(currentWord);

        if (habitMatches.length > 0) {
          autocompleteSuggestions = habitMatches.map((w) => ({
            text: w,
            type: "habit",
            icon: "fas fa-star",
          }));
        } else {
          // Fallback to dictionary
          let dictMatches = dictionaryTrie.startsWith(currentWord).slice(0, 10); // limit for performance
          autocompleteSuggestions = dictMatches.map((w) => ({
            text: w,
            type: "dictionary",
            icon: "fas fa-book",
          }));
        }

        if (autocompleteSuggestions.length > 0) {
          showAutocomplete();
        } else {
          hideAutocomplete();
        }
      } else {
        hideAutocomplete();
      }
    });

    // Handle arrow key navigation in autocomplete
    let selectedIndex = -1;

    noteEditor.addEventListener("keydown", (e) => {
      if (!autocompleteActive) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedIndex = Math.min(
          selectedIndex + 1,
          autocompleteSuggestions.length - 1
        );
        updateAutocompleteSelection();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateAutocompleteSelection();
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        selectAutocompleteItem(selectedIndex);
      } else if (e.key === "Escape") {
        e.preventDefault();
        hideAutocomplete();
      }
    });

    // Hide autocomplete when clicking elsewhere
    document.addEventListener("click", (e) => {
      if (!autocompleteContainer.contains(e.target)) {
        hideAutocomplete();
      }
    });
  }

  // Replace the showAutocomplete function with this improved version
  function showAutocomplete() {
    autocompleteDropdown.innerHTML = "";

    autocompleteSuggestions.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.dataset.index = index;
      div.innerHTML = `
            <i class="${item.icon} autocomplete-icon"></i>
            <span class="autocomplete-text">${item.text}</span>
            <span class="autocomplete-type">${item.type}</span>
            <span class="autocomplete-shortcut">↩ to select</span>
        `;

      div.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectAutocompleteItem(index);
      });

      autocompleteDropdown.appendChild(div);
    });

    // Position the dropdown intelligently
    positionAutocompleteDropdown();

    autocompleteActive = true;
    selectedIndex = -1;
  }
  // Replace the position-related functions with this smarter version
  function positionAutocompleteDropdown() {
    const range = window.getSelection().getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = noteEditor.getBoundingClientRect();

    // Calculate available space with a minimum margin
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const safeMargin = 20;

    // Fixed positioning (better for scrolling content)
    autocompleteContainer.style.position = "fixed";

    // Calculate ideal width (based on editor width but not too wide)
    const idealWidth = Math.min(400, editorRect.width * 0.8);
    autocompleteContainer.style.width = `${idealWidth}px`;

    // Position horizontally - center relative to editor but keep in viewport
    let leftPosition = editorRect.left + (editorRect.width - idealWidth) / 2;
    leftPosition = Math.max(
      safeMargin,
      Math.min(leftPosition, viewportWidth - idealWidth - safeMargin)
    );
    autocompleteContainer.style.left = `${leftPosition}px`;

    // Position vertically - prefer above text unless there's more space below
    const cursorTop = rect.top;
    const cursorBottom = rect.bottom;
    const spaceBelow = viewportHeight - cursorBottom - safeMargin;
    const spaceAbove = cursorTop - safeMargin;

    // Calculate max height based on available space
    const maxHeight = Math.min(300, Math.max(spaceBelow, spaceAbove) - 20);
    autocompleteDropdown.style.maxHeight = `${maxHeight}px`;

    // Position above or below based on available space
    if (spaceBelow > maxHeight || spaceBelow > spaceAbove) {
      // Position below with slight offset from cursor
      autocompleteContainer.style.top = `${
        cursorBottom + window.scrollY + 5
      }px`;
      autocompleteContainer.style.bottom = "auto";
    } else {
      // Position above with slight offset from cursor
      autocompleteContainer.style.bottom = `${
        viewportHeight - cursorTop + window.scrollY + 5
      }px`;
      autocompleteContainer.style.top = "auto";
    }

    autocompleteContainer.style.display = "block";
  }

  // Remove the resize and scroll event listeners - we don't need them anymore
  // Add this instead for content changes in the editor
  const observer = new MutationObserver(() => {
    if (autocompleteActive) {
      positionAutocompleteDropdown();
    }
  });

  observer.observe(noteEditor, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Hide autocomplete dropdown
  function hideAutocomplete() {
    autocompleteContainer.style.display = "none";
    autocompleteActive = false;
    selectedIndex = -1;
  }

  // Update selected item in autocomplete
  function updateAutocompleteSelection() {
    const items = autocompleteDropdown.querySelectorAll(".autocomplete-item");
    items.forEach((item, index) => {
      if (index === selectedIndex) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }
  function selectAutocompleteItem(index) {
    if (index < 0 || index >= autocompleteSuggestions.length) return;

    const selected = autocompleteSuggestions[index];
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    let textNode = range.startContainer;
    let offset = range.startOffset;

    // Handle case where the editor itself is selected
    if (textNode === noteEditor) {
      // If editor is empty, create a text node
      if (!noteEditor.firstChild) {
        textNode = document.createTextNode("");
        noteEditor.appendChild(textNode);
      } else {
        // Find the deepest text node at cursor position
        const nodeAtCursor = document.getSelection().anchorNode;
        textNode =
          nodeAtCursor.nodeType === Node.TEXT_NODE
            ? nodeAtCursor
            : document.createTextNode("");
        if (nodeAtCursor !== textNode) {
          noteEditor.appendChild(textNode);
        }
      }
      offset = 0;
    }

    const text = textNode.textContent || "";
    let wordStart = offset;

    // Find the start of the current word
    while (wordStart > 0 && !/\s/.test(text[wordStart - 1])) {
      wordStart--;
    }

    // Create a new range for the current word
    const wordRange = document.createRange();
    wordRange.setStart(textNode, wordStart);
    wordRange.setEnd(textNode, offset);

    // Delete the current partial word
    wordRange.deleteContents();

    // Insert the selected suggestion with a trailing space
    const trailingSpace = text.length > offset ? " " : "";
    const textToInsert = selected.text + trailingSpace;
    wordRange.insertNode(document.createTextNode(textToInsert));

    // Create new cursor position (after inserted word + space)
    const newCursorPos = wordStart + textToInsert.length;

    // Set cursor position
    const newRange = document.createRange();

    // Special handling for end of text node
    if (newCursorPos >= textNode.length) {
      // If at end, create new text node if needed
      if (!textNode.nextSibling) {
        const nextNode = document.createTextNode("");
        textNode.parentNode.insertBefore(nextNode, textNode.nextSibling);
      }
      newRange.setStart(textNode.nextSibling, 0);
    } else {
      newRange.setStart(textNode, newCursorPos);
    }

    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    // Trigger input event for auto-save and counters
    const inputEvent = new Event("input", { bubbles: true });
    noteEditor.dispatchEvent(inputEvent);

    hideAutocomplete();

    // Ensure editor maintains focus
    noteEditor.focus();

    // Small delay to ensure DOM updates complete before checking position
    setTimeout(() => {
      // Check if cursor is visible, scroll if needed
      const cursorRect = newRange.getBoundingClientRect();
      const editorRect = noteEditor.getBoundingClientRect();

      if (
        cursorRect.top < editorRect.top ||
        cursorRect.bottom > editorRect.bottom
      ) {
        newRange.startContainer.parentNode.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }, 50);
  }

  // ... (rest of the code remains the same)  // Set up event listeners
  function setupEventListeners() {
    newNoteBtn.addEventListener("click", createNewNote);
    saveNoteBtn.addEventListener("click", saveNote);
    deleteNoteBtn.addEventListener("click", deleteNote);

    searchNotes.addEventListener("input", (e) => {
      renderNotesList(e.target.value);
    });

    themeToggle.addEventListener("click", () => {
      setTheme(!isDarkMode);

      // Animate toggle
      themeToggle.classList.add("animate__animated", "animate__rotateIn");
      setTimeout(() => {
        themeToggle.classList.remove("animate__animated", "animate__rotateIn");
      }, 500);
    });

    // Update the keydown event listener for better keyboard navigation
    noteEditor.addEventListener("keydown", (e) => {
      if (autocompleteActive) {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            selectedIndex = Math.min(
              selectedIndex + 1,
              autocompleteSuggestions.length - 1
            );
            updateAutocompleteSelection();
            scrollToSelectedItem();
            break;

          case "ArrowUp":
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateAutocompleteSelection();
            scrollToSelectedItem();
            break;

          case "Enter":
            e.preventDefault();
            if (selectedIndex >= 0) {
              selectAutocompleteItem(selectedIndex);
            }
            break;

          case "Escape":
            e.preventDefault();
            hideAutocomplete();
            break;

          case "Tab":
            if (selectedIndex >= 0) {
              e.preventDefault();
              selectAutocompleteItem(selectedIndex);
            }
            break;
        }
      }
    });

    // Add this helper function to ensure selected item is visible
    function scrollToSelectedItem() {
      if (selectedIndex >= 0) {
        const items =
          autocompleteDropdown.querySelectorAll(".autocomplete-item");
        if (items[selectedIndex]) {
          items[selectedIndex].scrollIntoView({
            block: "nearest",
            behavior: "smooth",
          });
        }
      }
    }
  }
  // Add click handler for autocomplete items
  autocompleteDropdown.addEventListener("mousedown", (e) => {
    const item = e.target.closest(".autocomplete-item");
    if (item) {
      e.preventDefault();
      const index = parseInt(item.dataset.index);
      selectAutocompleteItem(index);
    }
  });
  // Initialize the app
  init();
});
// Update window resize handler to reposition dropdown
window.addEventListener("resize", () => {
  if (autocompleteActive) {
    positionAutocompleteDropdown();
  }
});

// Update scroll handler to reposition dropdown
window.addEventListener(
  "scroll",
  () => {
    if (autocompleteActive) {
      positionAutocompleteDropdown();
    }
  },
  true
);
const SECRET_KEY = "storageslocal"; // Keep this safe and ideally not hardcoded

function encryptData(data) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
}

function decryptData(ciphertext) {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (e) {
    return {};
  }
}
// Example save
function saveWordFrequency(freq) {
  const encrypted = encryptData(freq);
  localStorage.setItem("word_Frequency", encrypted);
}

// Example load
function getWordFrequency() {
  const encrypted = localStorage.getItem("word_Frequency");
  return encrypted ? decryptData(encrypted) : {};
}
// Function: Save one word to frequency map
function saveWord(word) {
  if (!word.trim()) return; // skip empty
  let freq = getWordFrequency();
  let lower = word.toLowerCase();
  freq[lower] = (freq[lower] || 0) + 1;
  saveWordFrequency(freq);

  // Debug view
  document.getElementById("debug").textContent = JSON.stringify(freq, null, 2);
}

// Event: Listen for typing
document.getElementById("noteEditor").addEventListener("keyup", (e) => {
  // When user presses space, enter, or punctuation, record last word
  if (e.key === " " || e.key === "Enter" || /[.,!?]/.test(e.key)) {
    let text = e.target.textContent.trim();
    let words = text.split(/\s+/);
    let lastWord = words[words.length - 1];
    saveWord(lastWord);
  }
});
const HABIT_THRESHOLD = 2;
const habitTrie = new Trie();
const dictionaryTrie = new Trie();

function loadHabitTrie() {
  const freq = getWordFrequency(); // ✅ decrypts and parses
  Object.keys(freq).forEach((word) => {
    if (freq[word] >= HABIT_THRESHOLD) {
      habitTrie.insert(word);
    }
  });
}

loadHabitTrie();

fetch("words.txt")
  .then((response) => response.text())
  .then((data) => {
    const words = data.split(/\r?\n/).map((w) => w.trim().toLowerCase());
    words.forEach((word) => {
      if (word) dictionaryTrie.insert(word);
    });
    console.log("Dictionary loaded with", words.length, "words");
  })
  .catch((err) => console.error("Error loading dictionary:", err));
