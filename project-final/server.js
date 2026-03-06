let express = require("express");
let nedb = require("@seald-io/nedb");

let app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// create the database for stories
let database = new nedb({ filename: "stories.db", autoload: true });

console.log("server.js is starting up");

// GET route - get all stories
app.get("/stories", (request, response) => {
  console.log("someone requested all stories");
  let query = {};
  database.find(query, (err, results) => {
    if (err) {
      console.log("error finding stories: ", err);
      response.json({ stories: [] });
    } else {
      console.log("found " + results.length + " stories total");
      response.json({ stories: results });
    }
  });
});

// GET route - get stories for a specific dot
app.get("/stories/:dotIndex", (request, response) => {
  let dotIndex = parseInt(request.params.dotIndex);
  console.log("someone requested stories for dot #" + dotIndex);
  let query = { dotIndex: dotIndex };
  database.find(query, (err, results) => {
    if (err) {
      console.log("error finding stories for dot: ", err);
      response.json({ stories: [] });
    } else {
      console.log("found " + results.length + " stories for dot #" + dotIndex);
      response.json({ stories: results });
    }
  });
});

// POST route - submit a new story
app.post("/submit", (request, response) => {
  console.log("new story submission received!");
  console.log("body: ", request.body);

  let dotIndex = parseInt(request.body.dotIndex);
  let name = request.body.name;
  let spot = request.body.spot;
  let story = request.body.story;

  // basic check that we have all the data
  if (!name || !spot || !story) {
    console.log("missing data in submission");
    response.json({ success: false, message: "please fill in all fields" });
    return;
  }

  let newStory = {
    dotIndex: dotIndex,
    name: name,
    spot: spot,
    story: story,
    timestamp: Date.now(),
  };

  database.insert(newStory, (err, newDoc) => {
    if (err) {
      console.log("error saving story: ", err);
      response.json({ success: false, message: "error saving story" });
    } else {
      console.log("story saved successfully for dot #" + dotIndex);
      response.json({ success: true, story: newDoc });
    }
  });
});

app.listen(5001, () => {
  console.log("server is running on port 5001");
});
