// Import SQLite modules
const { Database } = require("sqlite3");
const { open } = require("sqlite");

const { v4: uuidv4 } = require("uuid");

const checkUser = async (req, res) => {
  try {
    const customData = req.headers["data"];
    const parsedData = JSON.parse(customData);
    const userEmail = parsedData.email;
    const password = parsedData.password;

    const db = await open({
      filename: "accounts.db",
      driver: Database,
    });

    // Check if username is not already taken
    const usernameTaken = await db.get(
      "SELECT * FROM users WHERE email = ?",
      userEmail
    );

    if (usernameTaken) {
      console.log("email already in use, signing in....");
      req.body = { userEmail: userEmail, password: password };
      signIn(req, res);
      return true;
    }

    // Insert new entry into users table
    await db.run("INSERT INTO users (email, password) VALUES (?, ?)", [
      userEmail,
      password,
    ]);
    await db.close();

    // User found, sign in immediately
    // Assuming you have access to the req and res objects here
    req.body = { userEmail: userEmail, password: password }; // Adjust as needed
    signIn(req, res);

    return true;
  } catch (error) {
    console.error("Error checking user:", error);
    return res.status(500).end("Error checking user");
  }
};

// Function to sign in to an account
const signIn = async (req, res) => {
  // Get credentials provided in form
  const { userEmail, password } = req.body;

  const db = await open({
    filename: "accounts.db",
    driver: Database,
  });

  const userRow = await db.get(
    "SELECT id, password FROM users WHERE email = ?",
    userEmail
  ); // Get ID and password from entry with provided username

  if (!userRow) {
    // No entry found, meaning the username is not registered
    res.status(401).end("Incorrect username or password."); // 401 "unauthorised" error
    return false;
  }
  const { id, password: hash } = userRow; // Get ID and hashed password from entry
  const passwordsMatch = password === hash;
  if (!passwordsMatch) {
    res.status(401).end("Incorrect email or password.");
    return false;
  }
  await db.close();

  const session = await generateSession(id); // Generate unique session code and store it in table

  res.cookie("session", session, {
    httpOnly: true,
  }); // Expires when web browser closed

  res.json({ session: session });
  return true;
};

// Function to generate and write session token to database
const generateSession = async (id) => {
  const db = await open({
    filename: "accounts.db",
    driver: Database,
  });

  var session;

  // Continually generate session until a unique one is found; collision for UUIDv4 is rare but a good precaution against errors
  while (true) {
    session = uuidv4(); // Generate UUIDv4

    // Check if session is already in use
    const sessionTaken = await db.get(
      "SELECT * FROM sessions WHERE session = ?",
      session
    );

    if (!sessionTaken) {
      // Not in use
      break; // End loop
    }
  }

  // Insert new entry into sessions table
  await db.run("INSERT INTO sessions (id, session) VALUES (?, ?)", [
    id,
    session,
  ]);
  await db.close();

  return session;
};

module.exports = {
  checkUser,
  signIn,
};
