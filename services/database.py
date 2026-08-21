import sqlite3

DATABASE = "chat_history.db"


# =====================================
# DATABASE CONNECTION
# =====================================

def get_connection():

    conn = sqlite3.connect(DATABASE)

    conn.execute("PRAGMA foreign_keys = ON")

    return conn


# =====================================
# CREATE DATABASE
# =====================================

def create_database():

    conn = get_connection()

    try:
        cursor = conn.cursor()

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_sessions(

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            title TEXT,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages(

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            chat_id INTEGER,

            role TEXT,

            message TEXT,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(chat_id) REFERENCES chat_sessions(id)

        )
        """)

        conn.commit()

    except sqlite3.Error as e:
        print("Database error in create_database:", e)

    finally:
        conn.close()


# =====================================
# CREATE NEW CHAT
# =====================================

def create_chat(title="New Chat"):

    conn = get_connection()

    chat_id = None

    try:
        cursor = conn.cursor()

        cursor.execute(

            """
            INSERT INTO chat_sessions(title)

            VALUES(?)
            """,

            (title,)

        )

        conn.commit()

        chat_id = cursor.lastrowid
        #print("Created Chat:", chat_id)

    except sqlite3.Error as e:
        print("Database error in create_chat:", e)

    finally:
        conn.close()

    return chat_id


# =====================================
# SAVE MESSAGE
# =====================================

def save_message(chat_id, role, message):

    conn = get_connection()

    try:
        cursor = conn.cursor()

        cursor.execute(

            """
            INSERT INTO messages(

                chat_id,
                role,
                message

            )

            VALUES(?,?,?)
            """,

            (
                chat_id,
                role,
                message
            )

        )

        conn.commit()

    except sqlite3.Error as e:
        print("Database error in save_message:", e)

    finally:
        conn.close()


# =====================================
# LOAD MESSAGES
# =====================================

def load_messages(chat_id):

    conn = get_connection()

    rows = []

    try:
        cursor = conn.cursor()

        cursor.execute(

            """
            SELECT role,message

            FROM messages

            WHERE chat_id=?

            ORDER BY id ASC
            """,

            (chat_id,)

        )

        rows = cursor.fetchall()

    except sqlite3.Error as e:
        print("Database error in load_messages:", e)

    finally:
        conn.close()

    return [

        {

            "role": row[0],

            "content": row[1]

        }

        for row in rows

    ]


# =====================================
# LOAD ALL CHAT SESSIONS
# =====================================

def load_chat_sessions():

    conn = get_connection()

    rows = []

    try:
        cursor = conn.cursor()

        cursor.execute(

            """
            SELECT id,title

            FROM chat_sessions

            ORDER BY id DESC
            """

        )

        rows = cursor.fetchall()

    except sqlite3.Error as e:
        print("Database error in load_chat_sessions:", e)

    finally:
        conn.close()

    return rows


# =====================================
# DELETE CHAT
# =====================================

def delete_chat(chat_id):

    conn = get_connection()

    try:
        cursor = conn.cursor()

        cursor.execute(

            """
            DELETE FROM messages

            WHERE chat_id=?
            """,

            (chat_id,)

        )

        cursor.execute(

            """
            DELETE FROM chat_sessions

            WHERE id=?
            """,

            (chat_id,)

        )

        conn.commit()

    except sqlite3.Error as e:
        print("Database error in delete_chat:", e)

    finally:
        conn.close()

# =====================================
# UPDATE CHAT TITLE
# =====================================

def update_chat_title(chat_id, title):

    conn = get_connection()

    try:
        cursor = conn.cursor()

        cursor.execute(

            """
            UPDATE chat_sessions

            SET title = ?

            WHERE id = ?
            """,

            (
                title,
                chat_id
            )

        )

        conn.commit()

    except sqlite3.Error as e:
        print("Database error in update_chat_title:", e)

    finally:
        conn.close()