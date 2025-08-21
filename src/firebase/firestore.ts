@@ .. @@
 export const getCredentials = async (userId: string) => {
   try {
    console.log('Saving credential to Firestore:', {
      userId,
      type: credentialData.type,
      documentId: `${userId}_${credentialData.type}`
    });
    
+    console.log('Fetching credentials for user:', userId);
     const credentialsRef = collection(db, 'credentials');
     const q = query(credentialsRef, where('userId', '==', userId));
     const querySnapshot = await getDocs(q);
     
     const credentials: UserCredentials[] = [];
     querySnapshot.forEach((doc) => {
-      credentials.push({ id: doc.id, ...doc.data() } as UserCredentials);
+      const data = doc.data();
+      console.log('Found credential document:', { id: doc.id, type: data.type });
+      credentials.push({ id: doc.id, ...data } as UserCredentials);
     });
     
+    console.log('Total credentials found:', credentials.length);
    
    console.log('Credential saved successfully');
     return { success: true, data: credentials, error: null };
   } catch (error: any) {
    console.error('Error saving credential:', error);
+    console.error('Error fetching credentials:', error);
     return { success: false, data: null, error: error.message };
   }
 };