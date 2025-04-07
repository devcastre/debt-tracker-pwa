//sw.js

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(`${window.location.pathname}sw.js`)
      .then(reg => console.log("SW registered", reg))
      .catch(err => console.error("SW failed", err));
  }
  





// User flow


document.addEventListener("DOMContentLoaded", function () {
    window.showPage = function (pageId) {
    
        document.querySelectorAll(".page").forEach(page => page.classList.add("hidden"));

    
        document.getElementById(pageId).classList.remove("hidden");

    
        updateActiveNav();

        
        localStorage.setItem("activePage", pageId);
    };

    function updateActiveNav() {
        const activePage = [...document.querySelectorAll(".page")].find(page => !page.classList.contains("hidden"));

        if (activePage) {
            const pageId = activePage.id;
            document.querySelectorAll(".navBtn").forEach(btn => btn.classList.remove("active"));

            if (pageId === "dashboard" || pageId === "debtor-info") {
                document.getElementById("dashboardNav").classList.add("active");
            } else if (pageId === "creditors" || pageId === "manage-debtors") {
                document.getElementById("creditorsNav").classList.add("active");
            } else if (pageId === "trash-bin") {
                document.getElementById("trashBinNav").classList.add("active");
            }
        }
    }

    
    const savedPage = localStorage.getItem("activePage") || "dashboard";
    showPage(savedPage);
});





function backToDebtors() {
    showPage('dashboard');
}

function backToCreditors() {
    showPage('creditors');
}

function adddebtToManageDebtors() {
    showPage('manage-debtors');

}

function minusdebtToManageDebtors() {
    showPage('manage-debtors');

}

function adddebtorsToCreditors() {
    showPage('creditors');
}














//SEARCH


function searchDebtor() {
    document.querySelectorAll('.searchBar').forEach(search => {
        search.addEventListener('input', () => {
            let searchValue = search.value.toLowerCase();
            let debtorsListed = document.querySelectorAll('.debtors');

            debtorsListed.forEach(debtor => {
                const debtorName = debtor.querySelector(".debtor-name").textContent.toLowerCase();
                debtor.style.display = debtorName.includes(searchValue) ? "grid" : "none";
            });
        });
    });

}



//Preview inputPic interactiion


document.getElementById('inputPicture').addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
        const imageURL = URL.createObjectURL(file);
        document.getElementById('newDebtorPic').src = imageURL;
    }
});





// ADD DEBTOR

async function addNewDebtor() {
    const inputDebtorsName = document.getElementById("inputDebtorsName").value;
    const inputContactNo = document.getElementById("inputContactNo").value;
    const inputInitialDebt = parseFloat(document.getElementById("inputInitialDebt").value);
    const inputFirstDate = document.getElementById("inputFirstDate").value;
    const inputFile = document.getElementById('inputPicture').files[0];


    if (!inputDebtorsName || !inputContactNo || isNaN(inputInitialDebt) || !inputFirstDate) {
        alert("Please fill in all required fields (profile picture optional).");
        return;
    }

    let inputPictureBase64 = null;


    if (inputFile) {
        inputPictureBase64 = await convertFileToBase64(inputFile);
    }


    await addDebtor(inputDebtorsName, inputPictureBase64, inputContactNo, inputInitialDebt, inputFirstDate);


    document.querySelectorAll("input").forEach(input => input.value = "");

 
    loadDashboardList();
    loadCreditorsList();
    adddebtorsToCreditors();
}







// Function to convert file to base64
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}









//DEBTOR INFO

async function loadDashboardList() {
    const db = await openDB();
    const transaction = db.transaction("debtors", "readonly");
    const debtorStore = transaction.objectStore("debtors");

    const request = debtorStore.getAll();
    request.onsuccess = () => {
        const debtors = request.result;
        const dashboardlists = document.getElementById('dashboard-list');

        dashboardlists.innerHTML = "";

        const activeDebtors = debtors.filter(debtor => !debtor.deleted);
        
        activeDebtors.sort((a, b) => b.balance - a.balance);
        activeDebtors.forEach((debtor) => {
            const li = document.createElement("li");
            li.className = "debtors";
            li.dataset.id = debtor.id;
            li.onclick = () => showPage("debtor-info");
            li.innerHTML = `<span class="debtor-name">${debtor.inputDebtorsName}</span><span>₱ ${debtor.balance}</span>`;
            dashboardlists.appendChild(li);
        });
        
    };
    
};



async function loadDebtorsInfo(debtorId) {
    const db = await openDB();

   
    const debtor = await new Promise((resolve, reject) => {
        const transaction = db.transaction("debtors", "readonly");
        const debtorStore = transaction.objectStore("debtors");
        const request = debtorStore.get(debtorId);

        request.onsuccess = () => resolve(request.result || {});
        request.onerror = () => reject(request.error);
    });

    
    document.getElementById("debtor-name").textContent = debtor.inputDebtorsName || debtor.name;

    const debtorImageElement = document.getElementById("defaultPic");

    if (debtor.inputPictureBase64) {
        
        const mimeType = detectMimeType(debtor.inputPictureBase64);
        debtorImageElement.src = `data:${mimeType};base64,${debtor.inputPictureBase64}`;
    } else {
        
        debtorImageElement.src = '/icons/default-profile-picture1.png'; 
    }

    document.querySelectorAll(".remainingBalances").forEach((el) => {
        el.textContent = `₱${debtor.balance}`;
    });


    const debtorHistory = await new Promise((resolve, reject) => {
        const historyTransaction = db.transaction("debtRecords", "readonly");
        const recordStore = historyTransaction.objectStore("debtRecords");


        console.log([...recordStore.indexNames]);

    
        if (!recordStore.indexNames.contains("debtorId")) {
            console.error("Index 'debtorId' does not exist. Database setup might be incorrect.");
            return;
        }
        const requestHistory = recordStore.index("debtorId").getAll(debtorId);

        requestHistory.onsuccess = () => resolve(requestHistory.result || []);
        requestHistory.onerror = () => reject(requestHistory.error);
    });


    const payments = debtorHistory.filter(record => record.status === "Payment");
    const debts = debtorHistory.filter(record => record.status === "Debt");
    

    payments.sort((a, b) => new Date(b.date) - new Date(a.date));
    debts.sort((a, b) => new Date(b.date) - new Date(a.date));

    const recentPayments = payments.slice(0, 3);
    const recentDebts = debts.slice(0, 3);


    const paymentHistoryContainer = document.getElementById('paymentHistoryContainer');
    paymentHistoryContainer.innerHTML = recentPayments.length
        ? recentPayments.map(payment => `<li class="paymentHistory-list"><span class="date">${payment.date}</span><span class="payamount-history">₱${Math.abs(payment.amount)}</span></li>`).join("")
        : "<li>No payment history available.</li>";

   
    const debtHistoryContainer = document.getElementById('debtHistoryContainer');
    debtHistoryContainer.innerHTML = recentDebts.length
        ? recentDebts.map(debt => `<li class="debtHistory-list"><span class="date">${debt.date}</span><span class="debtamount-history">₱${debt.amount}</span></li>`).join("")
        : "<li>No debt history available.</li>";
}


function detectMimeType(base64Image) {
    const mimeTypeRegex = /^data:(image\/(png|jpeg|jpg|gif|webp));base64,/;
    const match = base64Image.match(mimeTypeRegex);

    if (match) {
        return match[1];
    }
    
    return 'image/png'; 
}








// MANAGE DEBTOR


async function loadCreditorsList() {
    const db = await openDB();
    const transaction = db.transaction("debtors", "readonly");
    const debtorStore = transaction.objectStore("debtors");

    const request = debtorStore.getAll();
    request.onsuccess = () => {
        const debtors = request.result;
        const creditorslists = document.getElementById('creditors-list'); 

        creditorslists.innerHTML = ""; 

        const activeDebtors = debtors.filter(debtor => !debtor.deleted);

        activeDebtors.sort((a, b) => b.balance - a.balance);
        activeDebtors.forEach((debtor) => {
            const li = document.createElement("li");
            li.className = "debtors";
            li.dataset.id = debtor.id;
            li.onclick = () => showPage("manage-debtors");
            li.innerHTML = `<span class="debtor-name">${debtor.inputDebtorsName}</span>
                            <span>₱ ${debtor.balance}</span>
                            <button id="debtorTrashBtn" class="trashDebtorBtn" data-id="${debtor.id}">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="trashIcon">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </button>`;
            creditorslists.appendChild(li);
            
        });
        
        
    };
    
}

async function loadManageDebtors(debtorId) {
    if (!debtorId) {
        console.error("Error: debtorId is undefined or null.");
        return;
    }

    const db = await openDB();
    const transaction = db.transaction("debtors", "readonly");
    const debtorStore = transaction.objectStore("debtors");

    
    const debtor = await new Promise((resolve, reject) => {
        const request = debtorStore.get(debtorId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Failed to retrieve debtor data.");
    });

    if (!debtor) {
        console.error("Debtor not found in IndexedDB.");
        return;
    }

    document.getElementById("manageDebtor-name").textContent = debtor.inputDebtorsName || debtor.name;
    
    const debtorImageElement = document.getElementById("managedefaultPic");

    
    if (debtor.inputPictureBase64) {
        const mimeType = detectMimeType(debtor.inputPictureBase64);
        debtorImageElement.src = `data:${mimeType};base64,${debtor.inputPictureBase64}`;
    } else {
        debtorImageElement.src = "/icons/default-profile-picture1.png";
    }

   
    const updatePictureBtn = document.getElementById("updatePicture");
    const removePictureBtn = document.getElementById("removePicture");

    updatePictureBtn.dataset.debtorId = debtorId;
    removePictureBtn.dataset.debtorId = debtorId;

    
    updatePictureBtn.replaceWith(updatePictureBtn.cloneNode(true));
    removePictureBtn.replaceWith(removePictureBtn.cloneNode(true));

 
    const newUpdatePictureBtn = document.getElementById("updatePicture");
    const newRemovePictureBtn = document.getElementById("removePicture");

    newUpdatePictureBtn.dataset.debtorId = debtorId;
    newRemovePictureBtn.dataset.debtorId = debtorId;

   
    newUpdatePictureBtn.addEventListener("change", async function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function (e) {
            const base64String = e.target.result.split(",")[1];

           
            debtorImageElement.src = e.target.result; 

         
            const dbUpdate = await openDB();
            const updateTx = dbUpdate.transaction("debtors", "readwrite");
            const updateStore = updateTx.objectStore("debtors");

            let debtorToUpdate = await new Promise((resolve, reject) => {
                const request = updateStore.get(debtorId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject("Failed to retrieve debtor for update.");
            });

            if (debtorToUpdate) {
                debtorToUpdate.inputPictureBase64 = base64String;
                await updateStore.put(debtorToUpdate);
                console.log("Profile picture updated for debtor:", debtorId);
            }
        };
        reader.readAsDataURL(file);
    });

   
    newRemovePictureBtn.addEventListener("click", async function () {
        debtorImageElement.src = "/icons/default-profile-picture1.png";

     
        const dbUpdate = await openDB();
        const updateTx = dbUpdate.transaction("debtors", "readwrite");
        const updateStore = updateTx.objectStore("debtors");

        let debtorToUpdate = await new Promise((resolve, reject) => {
            const request = updateStore.get(debtorId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Failed to retrieve debtor for deletion.");
        });

        if (debtorToUpdate) {
            delete debtorToUpdate.inputPictureBase64;
            await updateStore.put(debtorToUpdate);
            console.log("Profile picture removed for debtor:", debtorId);
        }
    });

    document.querySelectorAll(".remainingBalances").forEach((el) => {
        el.textContent = `₱${debtor.balance}`;
    });

    const manageDebtBtns = document.getElementById("add-minusDebt");
    manageDebtBtns.innerHTML = `
        <div onclick="minusDebtBtn(${debtor.id})" class="manageAmountBtn" id="deductDebt">Deduct Debt</div>     
        <div onclick="addDebtBtn(${debtor.id})" class="manageAmountBtn" id="addDebt">Add Debt</div>
    `;
    const callButton = document.getElementById("callDebtors");
    callButton.dataset.id = debtor.id;
}






async function addDebtBtn(debtorId) {

    document.getElementById("manage-debtors").classList.add("hidden");
    document.getElementById('add-debt').classList.remove('hidden');

    const db = await openDB();
    const transaction = db.transaction("debtors", "readonly");
    const debtorStore = transaction.objectStore("debtors");

    const request = debtorStore.get(debtorId); 
    
    request.onsuccess = () => {
        const debtor = request.result;

        document.getElementById("addDebt-name").textContent = debtor.inputDebtorsName || debtor.name;

        const debtorImageElement = document.getElementById("addDebtPic");
  
        if (debtor.inputPictureBase64) {
            
            const mimeType = detectMimeType(debtor.inputPictureBase64);
            debtorImageElement.src = `data:${mimeType};base64,${debtor.inputPictureBase64}`;
        } else {
            
            debtorImageElement.src = '/icons/default-profile-picture1.png'; 
        }   
     
        document.querySelectorAll(".remainingBalances").forEach((el) => {
            el.textContent = `₱${debtor.balance}`;
        
        const addInputs = document.getElementById('addInputs');
        addInputs.innerHTML = `
                <label>
                    <h4>Add Debt</h4>
                    <input type="text" id="inputAddDebt">
                </label>
                <label>
                    <h4>Date of Debt</h4>
                    <input type="date" id="inputDateofAddDebt">
                </label>
                <button class="updateDebtAmount" id="confirmAddDebt" onclick="plusDebt(${debtor.id})">CONFIRM</button>
        `;  
        });
    };
     
}

async function minusDebtBtn(debtorId) {

    document.getElementById("manage-debtors").classList.add("hidden");
    document.getElementById('minus-debt').classList.remove('hidden');

    const db = await openDB();
    const transaction = db.transaction("debtors", "readonly");
    const debtorStore = transaction.objectStore("debtors");

    const request = debtorStore.get(debtorId); 
    
    request.onsuccess = () => {
        const debtor = request.result;

        document.getElementById("minusDebt-name").textContent = debtor.inputDebtorsName || debtor.name;
        
        const debtorImageElement = document.getElementById("minusDebtPic");
  
        if (debtor.inputPictureBase64) {
         
            const mimeType = detectMimeType(debtor.inputPictureBase64);
            debtorImageElement.src = `data:${mimeType};base64,${debtor.inputPictureBase64}`;
        } else {
            
            debtorImageElement.src = '/icons/default-profile-picture1.png';
        }    
     
        document.querySelectorAll(".remainingBalances").forEach((el) => {
            el.textContent = `₱${debtor.balance}`;
        
        const minusInputs = document.getElementById('minusInputs');
        minusInputs.innerHTML = `
                <label>
                    <h4>Minus Debt</h4>
                    <input type="text" id="inputMinusDebt">
                </label>
                <label>
                    <h4>Date of Debt</h4>
                    <input type="date" id="inputDateofMinusDebt">
                </label>
                <button class="updateDebtAmount" id="confirmminusDebt" onclick="minusDebt(${debtor.id})">CONFIRM</button>
        `;  
        });
        
    };
     
}








// ADD/MINUS DEBT


async function plusDebt(debtorId) {

    console.log(debtorId);

    const inputAddDebt = parseFloat(document.getElementById("inputAddDebt").value);
    const inputDateofAddDebt = document.getElementById("inputDateofAddDebt").value;

    await updateAdditionalDebt(debtorId, inputAddDebt, inputDateofAddDebt);
    
    
    loadDashboardList();
    loadCreditorsList();
    loadDebtorsInfo(debtorId);
    showPage('creditors');
    
}

async function minusDebt(debtorId) {

    console.log(debtorId);

    const inputMinusDebt = parseFloat(document.getElementById("inputMinusDebt").value);
    const inputDateofMinusDebt = document.getElementById("inputDateofMinusDebt").value;

    await updateDeductedDebt(debtorId, inputMinusDebt, inputDateofMinusDebt);
    
    
    loadDashboardList();
    loadCreditorsList();
    loadDebtorsInfo(debtorId);
    showPage('creditors');
    
}











//TRASH TAB

async function loadTrashList() {
    const db = await openDB();
    const transaction = db.transaction("debtors", "readonly");
    const debtorStore = transaction.objectStore("debtors");

    const request = debtorStore.getAll();
    request.onsuccess = () => {
        const debtors = request.result;
        const trashlists = document.getElementById('trash-list');

        trashlists.innerHTML = "";

        
        const deletedDebtors = debtors.filter(debtor => debtor.deleted === true);

        deletedDebtors.forEach((debtor) => { 
            const li = document.createElement("li");
            li.className = "debtors";
            li.dataset.id = debtor.id;
            li.innerHTML = `
                <span class="debtor-name">${debtor.inputDebtorsName}</span>
                <span>₱ ${debtor.balance}</span>
                <button id="debtorRestoreBtn" class="restoreDebtorBtn" data-id="${debtor.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="debtorRestoreBtnIcon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                    </svg>
                </button>

                <button id="debtorDeleteBtn" class="deleteDebtorBtn" data-id="${debtor.id}">
                    <svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24" id="debtorDeleteBtnIcon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>                
                </button>`;


            trashlists.appendChild(li);
            
        });
        
    };
    searchDebtor();
}



//MODAL
function showConfirmationModal(message, callback) {
    const modal = document.getElementById("confirmationModal");
    const modalMessage = document.getElementById("modalMessage");
    const confirmBtn = document.getElementById("confirmAction");
    const cancelBtn = document.getElementById("cancelAction");

    modalMessage.textContent = message;
    modal.classList.remove("hidden");

    
    confirmBtn.onclick = null;

    
    confirmBtn.onclick = async () => {
        modal.classList.add("hidden");
        await callback();
        loadDashboardList();
        loadCreditorsList();
        loadTrashList();
    };

    
    cancelBtn.onclick = () => {
        modal.classList.add("hidden");
    };
}


//DELETE EVENTS


// EVENT DELEGATION FOR DELETE, RESTORE, AND PERMANENT DELETE BUTTONS
document.body.addEventListener("pointerdown", (e) => {
    const trashBtn = e.target.closest(".trashDebtorBtn");
    const restoreBtn = e.target.closest(".restoreDebtorBtn");
    const deleteBtn = e.target.closest(".deleteDebtorBtn");

    if (trashBtn) {
        e.stopPropagation();
        const debtorId = Number(trashBtn.dataset.id);
        showConfirmationModal(
            "Tapon ko na ba?",
            () => trashDebtor(debtorId).then(() => {
                loadDashboardList();
                loadCreditorsList();
                loadTrashList();
            })
        );
    }

    if (restoreBtn) {
        const debtorId = Number(restoreBtn.dataset.id);
        showConfirmationModal(
            "Balik ko ba?",
            () => restoreDebtor(debtorId).then(() => loadTrashList())
        );
    }

    if (deleteBtn) {
        const debtorId = Number(deleteBtn.dataset.id);
        showConfirmationModal(
            `Delete ko na ba? Wala na balikan to!`,
            () => permanentlyDeleteDebtor(debtorId).then(() => loadTrashList())
        );
    }
});


function setupEmptyTrashButton() {
    showConfirmationModal(
        "Delete ko na ba lahat? Sure ka!",
        () => emptyTrash().then(() => {
            loadTrashList();
            loadCreditorsList();
            loadDashboardList();
        })
    );
}



document.addEventListener("click", function (event) {
    
    if (event.target.closest("svg")) {
        return; 
    }

    console.log("Clicked on:", event.target); 
});









//DOWNLOAD/BACKUP DATAS

document.getElementById('downloadDatas').addEventListener('click', function() {
    
    getDebtorsData().then(debtors => {

    
    const activeDebtors = debtors.filter(d => !d.deleted);
    activeDebtors.sort((a, b) => b.balance - a.balance);
     

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
  
     
      doc.setFont("helvetica", "normal");
      doc.setFontSize(16);
      doc.text('Debtors Information Backup', 20, 20);
  
   
      doc.setFontSize(12);
      let yOffset = 30;
  
     
      activeDebtors.forEach(debtor => {
        doc.text(`Name: ${debtor.inputDebtorsName}`, 20, yOffset);
        doc.text(`Remaining Balance: $${debtor.balance}`, 20, yOffset + 10);
        doc.text(`Contact: ${debtor.inputContactNo}`, 20, yOffset + 20);
        
        yOffset += 30; 
  
        
        if (yOffset > 250) {
          doc.addPage();
          yOffset = 20;
        }
      });
  
      
      doc.save('debtors_backup.pdf');
    }).catch(error => {
      console.error("Error fetching debtor data:", error);
    });
  });
  


//CALL FUNCTION
document.getElementById("callDebtors").addEventListener("click", function () {
    const debtorId = this.dataset.id;
  
    if (!debtorId) {
      alert("No debtor ID found on the button.");
      return;
    }
  
    console.log("Clicked debtor ID:", debtorId);
  
    getDebtorsData().then(debtors => {
      console.log("All debtors from database:", debtors);
  
      const debtor = debtors.find(d => String(d.id) === String(debtorId));
  
      if (!debtor) {
        alert("Debtor not found.");
        return;
      }
  
      const phone = debtor.inputContactNo;
  
      if (!phone) {
        alert("No phone number available for this debtor.");
        return;
      }
  
      console.log(`Preparing to call: tel:${phone}`);
  
      if (confirm(`Call ${phone}?`)) {
        window.location.href = `tel:${phone}`;
      }
    }).catch(err => {
      console.error("Failed to fetch debtor data:", err);
      alert("Error accessing debtor records. Please try again.");
    });
  });
  
    






//DOM LOADS


document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("dashboard")) {
        loadDashboardList();

    }
    if (document.getElementById("creditors")) {
        loadCreditorsList();

    }
    if (document.getElementById("creditors")) {
        loadTrashList();

    }

    if (document.getElementById("debtor-info")) {
        document.getElementById("dashboard-list").addEventListener("click", (event) => {
            const clickedItem = event.target.closest("li.debtors");   
        
            const debtorId = parseInt(clickedItem.dataset.id, 10); 
        
            loadDebtorsInfo(debtorId);
        });       
    }

    if (document.getElementById("manage-debtors")) {
        document.getElementById("creditors-list").addEventListener("click", (event) => {
            const clickedItem = event.target.closest("li.debtors");   
        
            const debtorId = parseInt(clickedItem.dataset.id, 10); 
        
            loadManageDebtors(debtorId);
        });  
    }
});



    