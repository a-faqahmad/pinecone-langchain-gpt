"use client";

import { useEffect, useState } from "react";

const Messages = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Type a question to get an answer...");

  const fetchData = async () => {
    if(!question) return;
    setAnswer("Loading...");
    const response = await fetch("http://localhost:3001/send-message-langchain", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });
    const data = await response.json();
    setAnswer(data.message);
  };

  return (
    <div>
        <div className="p-8 flex justify-between gap-4">
            <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full border-2 border-white p-2"
            />
            <button className="bg-gray-100 p-4" onClick={fetchData}>Send</button>
        </div>
        <div className="h-[84vh] flex justify-center items-center p-8">
            <div className="text-2xl font-extrabold">{answer}</div>
        </div>
    </div>
  );
};

export default Messages;
