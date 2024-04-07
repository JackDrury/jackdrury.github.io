import { createDbWorker } from "sql.js-httpvfs";

const workerUrl = new URL(
  "sql.js-httpvfs/dist/sqlite.worker.js",
  import.meta.url
);
const wasmUrl = new URL(
  "sql.js-httpvfs/dist/sql-wasm.wasm", 
  import.meta.url
  );

let maxBytesToRead = 25 * 1024 * 1024;
async function load(userQuery : string) {
  const worker = await createDbWorker(
    [
      {
        from: "inline",
        config: {
          serverMode: "full",
          url: "/something.sqlite3",
          requestChunkSize: 4096,
        },
      },
    ],
    workerUrl.toString(),
    wasmUrl.toString(),
    maxBytesToRead //worker.worker.bytesRead = 0; to reset bytesRead and prevent SQLite I/O error from too many disk reads resulting in bytesRead exceeding this number
  );

  const result = await worker.db.query(userQuery);//(`select * from mytable`);

  // Create a new <div> element to contain the result
  const resultContainer = document.createElement('div');
  // Set the content of the result container to the JSON string representation of the result
  resultContainer.textContent = JSON.stringify(result);

  // Append the result container to the document body
  document.body.appendChild(resultContainer);
}

const userInput = document.getElementById('userInput') as HTMLInputElement;
const submitButton = document.getElementById('submitButton');

const handleUserInput = () => {
    const query = userInput.value;
    load(query);
};

if (submitButton) {
    submitButton.addEventListener('click', handleUserInput);
}

userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent the default form submission behavior
        handleUserInput();
    }
});