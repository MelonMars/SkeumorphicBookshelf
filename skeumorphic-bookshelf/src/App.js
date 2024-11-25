import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import "./App.css";

const Book = ({ isbn, setupHoverEffect, handleRightClick }) => {
  const bookRef = useRef(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    fetch(`https://openlibrary.org/isbn/${isbn}.json`)
        .then((res) => res.json())
        .then((data) => {
          setTitle(data.title);
        });
  }, [isbn]);

  useEffect(() => {
    const adjustFontSize = () => {
      const book = bookRef.current;
      if (!book) return;

      const spineText = book.querySelector(".spine-text");
      const spine = book.querySelector(".spine");

      if (spineText && spine) {
        spineText.style.fontSize = "100px";
        const spineHeight = spine.clientHeight;
        const spineWidth = spine.clientWidth;

        while (
            (spineText.scrollHeight > spineHeight || spineText.scrollWidth > spineWidth) &&
            parseFloat(window.getComputedStyle(spineText).fontSize) > 1
            ) {
          const currentFontSize = parseFloat(window.getComputedStyle(spineText).fontSize);
          spineText.style.fontSize = `${currentFontSize - 1}px`;
        }
      }
    };

    adjustFontSize();

    window.addEventListener("resize", adjustFontSize);
    return () => {
      window.removeEventListener("resize", adjustFontSize);
    };
  }, [title]);

  useEffect(() => {
    const book = bookRef.current;
    if (book) {
      setupHoverEffect(book);
      book.addEventListener("contextmenu", handleRightClick);
    }
    return () => {
      if (book) {
        book.removeEventListener("contextmenu", handleRightClick);
      }
    };
  }, [setupHoverEffect, handleRightClick]);

  return (
      <div className="book" ref={bookRef}>
        <div className="spine">
          <span className="spine-text">{title}</span>
        </div>
        <div className="cover">
          <img
              src={`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`}
              alt="Book Cover"
          />
        </div>
      </div>
  );
};


const App = () => {
  const [bookshelves, setBookshelves] = useState([[]]);

  useEffect(() => {
    const storedBooks = JSON.parse(localStorage.getItem("books")) || [];
    const shelves = [];
    for (let i = 0; i < storedBooks.length; i += 10) {
      shelves.push(storedBooks.slice(i, i + 10));
    }
    setBookshelves(shelves);
  }, []);

  useEffect(() => {
    const books = document.querySelectorAll(".book .spine");
    books.forEach((spine) => {
      const event = new Event("mouseout");
      spine.dispatchEvent(event);
    });
  }, []);

  const setupHoverEffect = (book) => {
    const cover = book.querySelector(".cover");
    const spine = book.querySelector(".spine");
    const coverImg = book.querySelector(".cover img");

    spine.addEventListener("mouseover", () => {
      const bookIndex = Array.from(document.querySelectorAll(".book")).indexOf(book);
      document.querySelectorAll(".book").forEach((b, i) => {
        if (i > bookIndex) b.style.transform = "translateX(105px)";
      });
      cover.style.transform = "rotateY(30deg) translateX(-1.7px)";
      coverImg.style.transform = "rotateY(-30deg)";
      spine.style.transform = "rotateY(-30deg) translateX(3.3px)";
    });

    spine.addEventListener("mouseout", () => {
      document.querySelectorAll(".book").forEach((b) => {
        b.style.transform = "translateX(0)";
      });
      cover.style.transform = "rotateY(95deg) translateX(-1px)";
      spine.style.transform = "rotateY(0deg)";
    });
  };

  const handleRightClick = (event) => {
    event.preventDefault();
    const bookElement = event.currentTarget;
    const bookIndex = Array.from(document.querySelectorAll(".book")).indexOf(bookElement);
    Swal.fire({
      title: "Delete Book",
      text: "Do you want to delete this book?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, keep it",
    }).then((result) => {
      if (result.isConfirmed) {
        const updatedBooks = bookshelves.flat().filter((_, index) => index !== bookIndex);
        const shelves = [];
        for (let i = 0; i < updatedBooks.length; i += 10) {
          shelves.push(updatedBooks.slice(i, i + 10));
        }
        setBookshelves(shelves);
        localStorage.setItem("books", JSON.stringify(updatedBooks));
      }
    });
  };

  const addBook = (isbn) => {
    const updatedBooks = bookshelves.flat().concat(isbn);
    const shelves = [];
    for (let i = 0; i < updatedBooks.length; i += 10) {
      shelves.push(updatedBooks.slice(i, i + 10));
    }
    setBookshelves(shelves);
    localStorage.setItem("books", JSON.stringify(updatedBooks));
  };

  const openGalleryModal = (covers) => {
    Swal.fire({
      title: "Select a Book Cover",
      html: `<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">
        ${covers
          .map(
              (cover) => `
          <img
            src="https://covers.openlibrary.org/b/isbn/${cover}-M.jpg"
            alt="Book Cover"
            style="width: 100px; cursor: pointer;"
            onclick="window.selectBook('${cover}')"
          />
        `
          )
          .join("")}
      </div>`,
      showCloseButton: true,
      showConfirmButton: false,
      width: '80%',
      didOpen: () => {
        window.selectBook = (isbn) => {
          Swal.close();
          addBook(isbn);
        };
      },
    });
  };

  const openModal = () => {
    Swal.fire({
      title: "Enter Book Title",
      input: "text",
      inputPlaceholder: "Enter the title of the book",
      showCancelButton: true,
      confirmButtonText: "Next",
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`https://openlibrary.org/search.json?q=${result.value}`)
            .then((res) => res.json())
            .then((data) => {
              const allIsbns = data.docs.flatMap((doc) => doc.isbn || []);
              openGalleryModal(allIsbns.slice(0, 10));
            });
      }
    });
  };

  document.querySelectorAll('button').forEach(button => {
    button.addEventListener('mousemove', (e) => {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      button.style.setProperty('--mouse-x', `${x}px`);
      button.style.setProperty('--mouse-y', `${y}px`);
    });
  });
  
      return (
      <div>
        {bookshelves.map((shelf, shelfIndex) => (
            <div
                key={shelfIndex}
                className="bookshelf"
                style={{
                  paddingRight: `${10 * shelf.length}px`,
                  paddingLeft: `10px`
                }}
            >
              {shelf.map((isbn, index) => (
                  <Book key={index} isbn={isbn} setupHoverEffect={setupHoverEffect} handleRightClick={handleRightClick} />
              ))}
            </div>
        ))}
        <button onClick={openModal}>Add Book</button>
      </div>
  );
};
export default App;