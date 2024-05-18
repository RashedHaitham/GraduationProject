const { Database } = require("sqlite3");
const { open } = require("sqlite");

const homePage = async (req, res, next) => {
  const session = req.query.session;

  const { email } = await getUserDetails(session);

  if (!email) {
    // Session does not exist in database
    res.clearCookie("session"); // Clear cookie because session is invalid
    res.redirect("/sign-in");
    return;
  }

  var parts = email.split('@');
  var name = parts[0];

  res.end(`
        <!DOCTYPE html>
        <html>
            <head lang="en">
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Home</title>
                <link rel="stylesheet" href="/styles.css">
            </head>
            <body>
                <div class="home">
                    <div class="home__container">
                        <div class="home__container__users-view">
                            <h2 class="home__header">Users</h2>
                            <div class="home__container__users-view__list"></div>
                            <div class="home__container__users-view__bottom">
                                <p class="home__container__users-view__bottom__username"><strong>Signed in as:</strong> ${name}</p>
                            </div>
                        </div>
                        <div class="home__container__chat-view">
                            <h2 class="home__header">Chat</h2>
                            <div class="home__container__chat-view__chatlog"></div>
                            <div class="home__container__chat-view__message">
                                <input type="text" class="home__container__chat-view__message__body" placeholder="Type message here..." required>
                                <button type="button" class="home__container__chat-view__message__send">SEND</button>
                                <div class="home__container__chat-view__message__char-count">0/250</div>
                            </div>
                        </div>
                    </div>
                </div>
                <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.4/jquery.min.js"></script>
                <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
                <script>
                    const myUsername = "${name}"
                </script>
                <script src="scripts/home.js"></script>
            </body>
        </html>
    `);
};

// Function to get user details corresponding to ID from database
const getUserDetails = async (session) => {
  const db = await open({
    filename: "accounts.db",
    driver: Database,
  });

  const sessionRow = await db.get(
    "SELECT id FROM sessions WHERE session = ?",
    session
  );

  if (!sessionRow) {
    return false;
  }

  const id = sessionRow.id;

  const userRow = await db.get("SELECT * FROM users WHERE id = ?", id); // Get user information corresponding to given ID

  if (!userRow) {
    // No entry found
    return false;
  }

  await db.close();

  return userRow;
};

module.exports = {
  homePage,
};
