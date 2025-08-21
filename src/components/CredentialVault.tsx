@@ .. @@
   const saveCredentials = async () => {
     if (!currentUser) return;
     
     if (!accessToken.trim() || !pageId.trim()) {
       setValidationMessage('❌ Please enter both Access Token and Page ID');
       return;
     }

     setIsSaving(true);

     try {
       const credentialData = {
         type: 'facebook',
         accessToken: accessToken.trim(),
         pageId: pageId.trim(),
         expiryDate: expiryDate || '',
         createdAt: new Date().toISOString(),
         lastValidated: new Date().toISOString()
       };

+      console.log('Saving Facebook credentials:', {
+        type: credentialData.type,
+        hasAccessToken: !!credentialData.accessToken,
+        hasPageId: !!credentialData.pageId,
+        userId: currentUser.uid
+      });

       await saveCredential(currentUser.uid, credentialData);
       setValidationMessage('✅ Credentials saved successfully!');
       await loadSavedCredentials();
     } catch (error) {
+      console.error('Error saving Facebook credentials:', error);
       setValidationMessage(`❌ Error saving credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
     } finally {
       setIsSaving(false);
     }
   };