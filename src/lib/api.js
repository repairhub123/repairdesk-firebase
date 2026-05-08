import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "./firebase";

const JOBS_COLLECTION = "jobs";

const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function fetchJobs() {
  const path = JOBS_COLLECTION;
  try {
    const q = query(collection(db, path), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addJob(payload) {
  const path = JOBS_COLLECTION;
  try {
    const docRef = await addDoc(collection(db, path), {
      ...payload,
      status: "Pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      receivedAt: serverTimestamp(),
    });
    return { id: docRef.id };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function editJob(id, patch) {
  const path = `${JOBS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, JOBS_COLLECTION, id);
    await updateDoc(docRef, {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markCompleted(id) {
  const path = `${JOBS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, JOBS_COLLECTION, id);
    await updateDoc(docRef, {
      status: "Completed",
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function uploadPhoto(file) {
  try {
    const filename = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `jobs/${filename}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { path: url };
  } catch (error) {
    console.error("Storage Error:", error);
    throw error;
  }
}

export function photoUrl(path) {
  return path || "";
}

export function formatINR(v) {
  const n = Number(v || 0);
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function display(v) {
  if (v === null || v === undefined) return "N/A";
  const s = String(v).trim();
  return s ? s : "N/A";
}

export async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
