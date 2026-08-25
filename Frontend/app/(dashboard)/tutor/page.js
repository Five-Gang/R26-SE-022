'use client';

import React from 'react';
import styles from './tutor.module.css';

export default function TutorPage() {
  return (
    <div className={styles.container}>
      
      {/* Sidebar for Chat History */}
      <aside className={styles.sidebar}>
        <button className={styles.newChatBtn}>+ New conversation</button>
        
        <div className={styles.historyHeader}>Recent</div>
        
        <div className={styles.historyList}>
          <div className={`${styles.historyItem} ${styles.active}`}>
            <div className={styles.historyTitle}>Integration by parts explained</div>
            <div className={styles.historyTime}>Just now</div>
          </div>
          <div className={styles.historyItem}>
            <div className={styles.historyTitle}>What is the LIATE rule?</div>
            <div className={styles.historyTime}>2h ago</div>
          </div>
          <div className={styles.historyItem}>
            <div className={styles.historyTitle}>Cell membrane functions</div>
            <div className={styles.historyTime}>Yesterday</div>
          </div>
          <div className={styles.historyItem}>
            <div className={styles.historyTitle}>Quick review of OS scheduling</div>
            <div className={styles.historyTime}>3 days ago</div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className={styles.mainArea}>
        
        <div className={styles.chatArea}>
          
          {/* User Message */}
          <div className={`${styles.messageRow} ${styles.messageRowUser}`}>
            <div className={`${styles.avatar} ${styles.avatarUser}`}>KM</div>
            <div className={`${styles.messageBubble} ${styles.bubbleUser}`}>
              Can you explain integration by parts and when I should use it?
            </div>
          </div>

          {/* AI Message */}
          <div className={styles.messageRow}>
            <div className={`${styles.avatar} ${styles.avatarAI}`}>AI</div>
            <div className={`${styles.messageBubble} ${styles.bubbleAI}`}>
              <p>
                <strong>Integration by parts</strong> is based on the product rule of differentiation:
              </p>
              
              <div className={styles.mathBlock}>
                ∫u dv = uv - ∫v du
              </div>
              
              <p>
                Use the <strong>LIATE rule</strong> to pick u: choose whichever type comes first — Logarithm, Inverse trig, Algebraic, Trigonometric, or Exponential. It works best when you have a product of two different function types.
              </p>
            </div>
          </div>

        </div>

        {/* Input Area */}
        <div className={styles.inputArea}>
          <div className={styles.inputWrapper}>
            <input 
              type="text" 
              className={styles.inputField} 
              placeholder="Ask a follow-up question..." 
            />
            <button className={styles.sendBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

      </main>

    </div>
  );
}
