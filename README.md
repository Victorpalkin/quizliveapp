# QuizLive

QuizLive is an interactive, real-time quiz application that allows users to host live quiz games and have players join and compete from their own devices. It's built with a modern web stack and leverages Firebase for its backend services.

## Features

### Host Features
- **Secure Authentication**: Hosts can sign in securely with email and password to access their dashboard and manage all quiz-related activities.
- **Quiz Dashboard**: A central hub to view all created quizzes, active games, and completed game records.
- **Quiz Creation & Editing**:
  - Create new quizzes with a title and an optional description.
  - Add, edit, and delete questions within a quiz.
  - **Flexible Answer Options**: For each question, hosts can specify between 2 and 8 answer choices.
  - **Image Uploads**: Upload an image or GIF for each question to make quizzes more visually engaging.
  - **Per-Question Time Limits**: Configure a specific time limit (10, 20, 30, or 60 seconds) for each individual question.
  - **Automatic Image Cleanup**: Images are automatically deleted from storage if a quiz, question, or image is deleted.
- **Game Hosting**:
  - Launch a live game session from any quiz with a single click.
  - A unique, auto-generated Game PIN is created for each game lobby.
  - **Synchronized Game Start**: The game begins for all players only when the host's screen is fully loaded, ensuring a fair start.
- **Live Game Management**:
  - View a real-time list of players who have joined the lobby.
  - **Synchronized Question Display**: Questions are revealed to players only after they have fully loaded on the host's screen, keeping everyone in sync.
  - Manually advance from the question results to the next question.
  - View a real-time count of how many players have answered.
  - See a distribution chart of player answers after each question.
  - Cancel the game at any point from the lobby or live game screen.
- **Game History**:
  - Review final leaderboards for completed games.
  - Delete old game records from the dashboard.

### Player Features
- **Easy Join**: Players can quickly join a game using a simple Game PIN without needing to create an account.
- **Nickname Selection**: Choose a nickname to appear on the leaderboard before joining.
- **Real-time Synchronized Gameplay**:
  - **Fair Start**: The quiz begins and questions appear only when the host is ready, ensuring no one gets a head start.
  - See questions appear on your screen as the host presents them.
  - Answer questions within the host-defined time limit.
  - Receive instant feedback on your answer (correct/incorrect) and the points awarded.
  - Points are calculated based on both correctness and speed.
- **Seamless Game Flow**:
  - Smooth transitions between joining, waiting in the lobby, answering questions, and viewing results.
  - Get clear status updates if the host starts or cancels the game.
- **Final Results**: See your final score when the quiz is over.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [ShadCN UI](https://ui.shadcn.com/) components.
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore & Storage)

## Getting Started

### 1. Firebase Setup
This project is configured to use Firebase for authentication and as its database.

1.  **Firebase Project**: The app is connected to a Firebase project. If you are running this locally through a tool like Firebase Studio, this is managed for you.
2.  **Authentication**: The app uses Firebase Authentication with the "Email/Password" sign-in method for hosts. To create a host user:
    - Go to the **Firebase Console** and select your project.
    - Navigate to **Authentication** > **Users** tab.
    - Click **"Add user"** and provide an email and password. You can then use these credentials to log in to the app's `/login` page.
3.  **Firestore & Storage Rules**: The database and file storage are secured with pre-configured rules (`firestore.rules` and `storage.rules`). These are managed automatically within the development environment.

### 2. Running the Development Server
Once your environment is set up, you can start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## Available Pages

- `/`: The home page where users can choose to host or join a game.
- `/login`: The sign-in page for hosts.
- `/host`: The host's dashboard to view, create, and manage quizzes and games.
- `/host/create`: The page for creating a new quiz.
- `/host/edit/[quizId]`: The page for editing an existing quiz.
- `/host/lobby/[gameId]`: The lobby screen for a game you are hosting.
- `/host/game/[gameId]`: The live game screen for the host, showing questions and leaderboards.
- `/join`: The page for players to enter a Game PIN.
- `/play/[gamePin]`: The game screen for players participating in a quiz.
