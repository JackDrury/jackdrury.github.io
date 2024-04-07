import { createDbWorker } from "sql.js-httpvfs";
import OpenAI from 'openai';
import { ChatCompletionMessage, ChatCompletionMessageParam } from 'openai/resources/chat';

const model_version = 'gpt-3.5-turbo-0125'

const workerUrl = new URL(
  "sql.js-httpvfs/dist/sqlite.worker.js",
  import.meta.url
);
const wasmUrl = new URL(
  "sql.js-httpvfs/dist/sql-wasm.wasm", 
  import.meta.url
  );

let maxBytesToRead = 25 * 1024 * 1024;
async function query_db(userQuery : string) {
  const worker = await createDbWorker(
    [
      {
        from: "inline",
        config: {
          serverMode: "full",
          url: "/cooldb.sqlite3",
          requestChunkSize: 4096,
        },
      },
    ],
    workerUrl.toString(),
    wasmUrl.toString(),
    maxBytesToRead //worker.worker.bytesRead = 0; to reset bytesRead and prevent SQLite I/O error from too many disk reads resulting in bytesRead exceeding this number
  );

  const result = await worker.db.query(userQuery);//(`select * from mytable`);
  return result;

}


const functions: OpenAI.Chat.ChatCompletionCreateParams.Function[] = [
    {
      name: "db_query",
      description: "Execute the given SQL query and return the results",
      parameters: {
        type: "object",
        properties: {
          target_query: {
            type: "string",
            description: "The SQL query to execute"
          }                
        },
        "required": ["target_query"]
      }
  },
];

async function callFunction(function_call: ChatCompletionMessage.FunctionCall): Promise<any> {
  const args = JSON.parse(function_call.arguments!);
  console.log(`This is the sql_query: ${function_call.arguments}`)
  return await query_db(args['target_query']);
}

async function main(userQuery : string, secret : string) {
  console.log('entered main')

  const openai = new OpenAI({
    apiKey: secret, // I am definitely getting rid of this
    dangerouslyAllowBrowser: true // This is only for testing purposes, obviously it is bad
  });
  

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `Please use our Premier League game database to answer questions. 
                It is a SQLite database that you can query with SQL using functions. 
                The database tables are structured as follows:
                CREATE TYPE team AS ENUM ('Chelsea', 'Middlesbrough', 'Bournemouth', 'Burnley', 'Everton',
                'Bradford City', 'West Ham', 'Nottingham Forest', 'Hull City', 'Swansea City', 'West Brom',
                'Huddersfield', 'Coventry City', 'Manchester City', 'Manchester Utd', 'Blackpool', 'Reading',
                'Fulham', 'Brentford', 'Portsmouth', 'Leicester City', 'Wimbledon',
                'Sheffield Weds', 'Ipswich Town', 'Barnsley', 'Sunderland', 'Blackburn', 'Brighton',
                'Charlton Ath', 'QPR', 'Norwich City', 'Sheffield Utd', 'Wolves', 'Tottenham', 'Aston Villa',
                'Derby County', 'Oldham Athletic', 'Birmingham City', 'Stoke City', 'Wigan Athletic', 'Cardiff City',
                'Newcastle Utd', 'Liverpool', 'Arsenal', 'Crystal Palace', 'Leeds United', 'Watford',
                'Southampton', 'Bolton', 'Swindon Town');

                CREATE TYPE game_result AS 
                    ENUM ('A', 'H', 'D'); 
                'A' means the away team won, 'H' means the home team won and 'D' means the result was a draw 

                CREATE TABLE premier_league_matches (season_end_year SMALLINT, season_week SMALLINT, 
                match_date DATE, home_team_name team, 
                home_team_goals SMALLINT, away_team_goals SMALLINT, 
                away_team_name team, full_time_result game_result);`,
    },
    {
      role: 'user',
      content: userQuery,
    },
  ];
  console.log(messages[0]);
  console.log(messages[1]);
  console.log();

  for (let i = 0; i < 15; i++) { // lets not go crazy with a million function calls
    const completion = await openai.chat.completions.create({
      model: model_version,
      messages,
      functions: functions,
    });

    const message = completion.choices[0]!.message;
    messages.push(message);
    console.log(message);

    // If there is no function call, we're done and can exit this loop
    if (!message.function_call) {
      break;
    }

    // If there is a function call, we generate a new message with the role 'function'.
    const result = await callFunction(message.function_call);
    const newMessage = {
      role: 'function' as const,
      name: message.function_call.name!,
      content: JSON.stringify(result),
    };
    messages.push(newMessage);

    console.log(newMessage);
    console.log();
    if (i === 14) {
      console.log('Breaking this loop because the model has made more than 15 queries since that seems like much more than enough for now')
    }
  }
  console.log('we are free of the for loop')
  const final_message = messages.slice(-1)

  // Create a new <div> element to contain the result
  const resultContainer = document.createElement('div');
  // Set the content of the result container to the JSON string representation of the result
  resultContainer.textContent = JSON.stringify(final_message);

  // Append the result container to the document body
  document.body.appendChild(resultContainer);  
  return;

}

const handleUserInput = () => {
    const query = userInput.value;
    const secret = apiKey.value;
    main(query,secret);
};

const apiKey = document.getElementById('apiKey') as HTMLInputElement;
const userInput = document.getElementById('userInput') as HTMLInputElement;
const submitButton = document.getElementById('submitButton');

if (submitButton) {
    submitButton.addEventListener('click', handleUserInput);
}

userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent the default form submission behavior
        handleUserInput();
    }
});

