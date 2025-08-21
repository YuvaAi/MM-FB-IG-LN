@@ .. @@
 export interface UserCredentials {
   platform: string;
   accessToken: string;
   pageId?: string;
+  linkedInUserId?: string;
+  instagramUserId?: string;
+  isCompanyPage?: boolean;
   expiryDate?: string;
   type: string;
   userId: string;
   createdAt?: any;
   updatedAt?: any;
 }