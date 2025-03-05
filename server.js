require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ✅ Test Route
app.get("/", (req, res) => {
    res.json({ message: "D&D Game Backend is Running!" });
});

// ✅ GET ALL PLAYERS FROM SUPABASE
app.get("/players", async (req, res) => {
    const { data, error } = await supabase.from("players").select("*");

    if (error) return res.status(500).json(error);
    res.json(data);
});

// ✅ ADD A NEW PLAYER TO SUPABASE
app.post("/players", async (req, res) => {
    const { name, playerClass, stats, inventory, quest_progress } = req.body;

    try {
        const { data, error } = await supabase
            .from("players")
            .insert([{ 
                name, 
                class: playerClass, 
                stats, 
                inventory, 
                quest_progress 
            }])
            .select(); 

        if (error) throw error;
        res.json({ message: "Player created!", data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Check if OpenAI API key is loaded
if (!process.env.OPENAI_API_KEY) {
    console.error("❌ ERROR: OpenAI API Key is missing! Check your .env file.");
}

// ✅ Generate a Story Using OpenAI
app.get("/story", async (req, res) => {
    try {
        console.log("🔍 Sending request to OpenAI...");

        const response = await fetch("https://api.openai.com/v1/chat/completions", { // ✅ FIXED ENDPOINT
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "You are a fantasy RPG game master. Generate a short adventure story with 4 choices." },
                    { role: "user", content: "The player has entered a dark cave. Generate a short story with 4 choices." }
                ],
                max_tokens: 200
            })
        });

        const data = await response.json();
        console.log("✅ OpenAI Response:", JSON.stringify(data, null, 2));

        if (data.error) {
            console.error("❌ OpenAI API Error:", data.error);
            return res.status(500).json({ error: data.error.message });
        }

        if (data.choices && data.choices.length > 0) {
            const storyText = data.choices[0].message.content.trim();
            const choices = ["Explore deeper", "Leave the cave", "Look for treasure", "Rest"];
            return res.json({ text: storyText, choices });
        } else {
            console.error("❌ OpenAI returned no choices.");
            return res.status(500).json({ error: "Failed to generate story from OpenAI" });
        }
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
