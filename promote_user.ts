import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from './src/services/firebaseConfig';

async function findAndPromoteKamalesh() {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("name", "==", "Kamalesh"));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    console.log("No user found with name Kamalesh");
    // Try displayName
    const q2 = query(usersRef, where("displayName", "==", "Kamalesh"));
    const snapshot2 = await getDocs(q2);
    if (snapshot2.empty) {
        console.log("No user found with displayName Kamalesh");
        return;
    }
    snapshot2.forEach(async (uDoc) => {
        console.log(`Found user: ${uDoc.id}, promoting to super_admin`);
        await updateDoc(doc(db, "users", uDoc.id), { role: "super_admin" });
    });
  } else {
    snapshot.forEach(async (uDoc) => {
      console.log(`Found user: ${uDoc.id}, promoting to super_admin`);
      await updateDoc(doc(db, "users", uDoc.id), { role: "super_admin" });
    });
  }
}

// Since I can't run this easily here, I'll just provide the code to the user or find another way.
