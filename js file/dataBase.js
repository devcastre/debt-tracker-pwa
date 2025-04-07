// db.js - Optimized Version

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("DebtTrackerDB", 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains("debtors")) {
                const debtorStore = db.createObjectStore("debtors", { keyPath: "id", autoIncrement: true });                
                debtorStore.createIndex("debtorId", "debtorId", { unique: false });
            }
            
            if (!db.objectStoreNames.contains("debtRecords")) {
                const recordStore = db.createObjectStore("debtRecords", { keyPath: "id", autoIncrement: true });
                recordStore.createIndex("debtorId", "debtorId", { unique: false });
            }

        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Failed to open IndexedDB.");
    });
}

// Add a new debtor
async function addDebtor(inputDebtorsName, inputPictureBase64, inputContactNo, inputInitialDebt, inputFirstDate) {
    try {
        const db = await openDB();
        const transaction = db.transaction(["debtors", "debtRecords"], "readwrite");
        const debtorStore = transaction.objectStore("debtors");            
        const recordStore = transaction.objectStore("debtRecords");        

        const debtor = { inputDebtorsName, inputPictureBase64, inputContactNo, inputInitialDebt, balance: inputInitialDebt, inputFirstDate}; 
        const debtorId = await new Promise((resolve) => {                 
            const request = debtorStore.add(debtor);                       
            request.onsuccess = () => resolve(request.result);
        });

        await recordStore.add({ debtorId, amount: inputInitialDebt, date: inputFirstDate, status: "Debt" });
        return debtorId;
    } catch (error) {
        console.error("Error adding debtor:", error);
    }
}




// Update additional debt
async function updateAdditionalDebt(debtorId, inputAddDebt, inputDateofAddDebt) {
    try {
        const db = await openDB();
        const transaction = db.transaction(["debtors", "debtRecords"], "readwrite");
        const debtorStore = transaction.objectStore("debtors");
        const recordStore = transaction.objectStore("debtRecords");

        const debtor = await new Promise((resolve, reject) => {
            const request = debtorStore.get(debtorId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Failed to retrieve debtor");
        });

        if (debtor) {
            debtor.balance += inputAddDebt;                                            
            await debtorStore.put(debtor);  
            await recordStore.add({ debtorId, amount: inputAddDebt, date: inputDateofAddDebt, status: "Debt" });
        }
    } catch (error) {
        console.error("Error updating additional debt:", error);
    }
}

// Update deducted debt
async function updateDeductedDebt(debtorId, inputMinusDebt, inputDateofMinusDebt) {
    try {
        const db = await openDB();
        const transaction = db.transaction(["debtors", "debtRecords"], "readwrite");
        const debtorStore = transaction.objectStore("debtors");
        const recordStore = transaction.objectStore("debtRecords");

        const debtor = await new Promise((resolve, reject) => {
            const request = debtorStore.get(debtorId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Failed to retrieve debtor");
        });

        if (debtor) {
            debtor.balance -= inputMinusDebt;                                            
            await debtorStore.put(debtor);  
            await recordStore.add({ debtorId, amount: inputMinusDebt, date: inputDateofMinusDebt, status: "Payment" });
        }
    } catch (error) {
        console.error("Error updating deducted debt:", error);
    }
}



//DELETE DEBTOR
async function trashDebtor(debtorId) {
    try {
        const db = await openDB();
        const transaction = db.transaction("debtors", "readwrite");
        const debtorStore = transaction.objectStore("debtors");

        
        const debtor = await new Promise((resolve, reject) => {
            const request = debtorStore.get(debtorId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Failed to retrieve debtor");
        });

        if (debtor) {
            debtor.deleted = true;
            await debtorStore.put(debtor);
        } else {
            console.log("Not Debtor");
        }

    } catch (error) {
        console.error("Error trashing debtor:", error);
    }
}


//RESTORE DEBTOR
async function restoreDebtor(debtorId) {
    try {
        const db = await openDB();
        const transaction = db.transaction("debtors", "readwrite");
        const debtorStore = transaction.objectStore("debtors");

        const debtor = await new Promise((resolve, reject) => {
            const request = debtorStore.get(debtorId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Failed to retrieve debtor.");
        });

        debtor.deleted = false;

        await new Promise((resolve, reject) => {
            const updateRequest = debtorStore.put(debtor);
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject("Failed to restore debtor.");
        });
        
        transaction.oncomplete = () => console.log("Transaction completed.");
        transaction.onerror = () => console.error("Transaction failed.");

    } catch (error) {
        console.error("Error trashing debtor:", error);
    }
}

// PERMANENT DELETE
async function permanentlyDeleteDebtor(debtorId) {
    try {
        const db = await openDB();
        const transaction = db.transaction(["debtors", "debtRecords"], "readwrite");
        const debtorStore = transaction.objectStore("debtors");
        const recordStore = transaction.objectStore("debtRecords");

        
        await new Promise((resolve, reject) => {
            const deleteDebtorRequest = debtorStore.delete(debtorId);
            deleteDebtorRequest.onsuccess = () => resolve();
            deleteDebtorRequest.onerror = () => reject("Failed to delete debtor.");
        });

        
        const index = recordStore.index("debtorId");
        const request = index.getAllKeys(debtorId);

        request.onsuccess = async () => {
            const debtRecordIds = request.result;
            for (const recordId of debtRecordIds) {
                await recordStore.delete(recordId);
            }
            console.log(`Debtor ID ${debtorId} and all their debt records permanently deleted.`);
        };

    } catch (error) {
        console.error("Error permanently deleting debtor:", error);
    }
}

async function emptyTrash() {
    try {
        const db = await openDB();
        const transaction = db.transaction(["debtors", "debtRecords"], "readwrite");
        const debtorStore = transaction.objectStore("debtors");
        const recordStore = transaction.objectStore("debtRecords");

        
        const debtors = await new Promise((resolve, reject) => {
            const request = debtorStore.getAll();
            request.onsuccess = () => resolve(request.result.filter(debtor => debtor.deleted));
            request.onerror = () => reject("Failed to retrieve trashed debtors.");
        });

        
        for (const debtor of debtors) {
            
            debtorStore.delete(debtor.id);

            
            const index = recordStore.index("debtorId");
            const range = IDBKeyRange.only(debtor.id);
            const cursorRequest = index.openCursor(range);

            cursorRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    recordStore.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };
        }

        console.log("All trashed debtors deleted successfully.");
    } catch (error) {
        console.error("Error deleting trashed debtors:", error);
    }
}

// Example function to fetch debtors data from IndexedDB
function getDebtorsData() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("DebtTrackerDB", 1);
      
      request.onerror = function(event) {
        reject("Database error: " + event.target.errorCode);
      };
  
      request.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(["debtors"], "readonly");
        const store = transaction.objectStore("debtors");
        const debtorData = [];
  
        store.openCursor().onsuccess = function(event) {
          const cursor = event.target.result;
          if (cursor) {
            debtorData.push(cursor.value);
            cursor.continue();
          } else {
            resolve(debtorData);
          }
        };
      };
    });
  }
  

