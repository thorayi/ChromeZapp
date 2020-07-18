chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.removeAll(function (info, tab) {
  });
  chrome.contextMenus.create({
    id: "WhatsApp",
    title: "WhatsApp",
    type: 'normal',
    contexts: ['all'],
  });
  chrome.contextMenus.create({
    id: "WhatsAppShareKey",
    parentId: "WhatsApp",
    title: "Share Key",
    type: 'normal',
    contexts: ['editable'],
  });
  chrome.contextMenus.create({
    id: "WhatsAppEncrypt",
    parentId: "WhatsApp",
    title: "Encrypt",
    type: 'normal',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: "WhatsAppDecrypt",
    parentId: "WhatsApp",
    title: "Decrypt",
    type: 'normal',
    contexts: ['selection'],
  });
});


function onClickHandler(menu, tab) {
  if(menu.menuItemId === 'WhatsAppEncrypt') {
    chrome.tabs.create({
      url: chrome.extension.getURL('dialog.html'),
      active: false
    }, function(tab) {
        // After the tab has been created, open a window to inject the tab
        chrome.windows.create({
            tabId: tab.id,
            type: 'popup',
            focused: true,
            left: 300,
            top: 300,
            height: 400,
            width: 400
          });
    });
  }
  else if(menu.menuItemId === 'WhatsAppDecrypt') {
    chrome.tabs.query({active:true}, async function(tabs){
      tabs.forEach(tab => {
          if(tab.title.includes('WhatsApp')) {
              let response = chrome.tabs.sendMessage(tab.id, {type:'decrypt'});
          }
      });
    });
  }
  else if(menu.menuItemId === 'WhatsAppShareKey') {
      let data = {};
      chrome.tabs.executeScript({
        code: `(${ shareKey })(${ JSON.stringify(data) })`
      }, ([status] = []) => {
        if (!chrome.runtime.lastError) {
          console.log(status);
        }
      });
      

      function shareKey(params) {

        function ab2str(buf) {
          return String.fromCharCode.apply(null, new Uint8Array(buf));
        }

        function str2ab(str) {
          const buf = new ArrayBuffer(str.length);
          const bufView = new Uint8Array(buf);
          for (let i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
          }
          return buf;
        }
      
        function importPublicKey(pem) {
          // base64 decode the string to get the binary data
          const binaryDerString = window.atob(pem);
          // convert from a binary string to an ArrayBuffer
          const binaryDer = str2ab(binaryDerString);
      
          return window.crypto.subtle.importKey(
            "spki",
            binaryDer,
            {
              name: "RSA-OAEP",
              hash: "SHA-256"
            },
            true,
            ["encrypt"]
          );
        }
  
        function importPrivateKey(pem) {
          // base64 decode the string to get the binary data
          const binaryDerString = window.atob(pem);
          // convert from a binary string to an ArrayBuffer
          const binaryDer = str2ab(binaryDerString);
        
          return window.crypto.subtle.importKey(
            "pkcs8",
            binaryDer,
            {
              name: "RSA-OAEP",
              hash: {name: "sha-256"},
              modulusLength: 2048,
              publicExponent: new Uint8Array([0x01, 0x00, 0x01]),  
            },
            true,
            ["decrypt"]
          );
        }
        
        function getMessageEncoding(message) {
          let enc = new TextEncoder();
          return enc.encode(message);
        }
        
        function encryptMessage(publicKey, message) {
          let encoded = getMessageEncoding(message);
          return window.crypto.subtle.encrypt(
            {
              name: "RSA-OAEP"
            },
            publicKey,
            encoded
          );
        }
  
        function decryptMessage(privateKey, ciphertext) {
          return window.crypto.subtle.decrypt(
            {
              name: "RSA-OAEP"
            },
            privateKey,
            ciphertext
          );
        }

        chrome.storage.local.get(['target','keypair'], async function(result){
          //let elements = document.getElementsByClassName(result.target);
          let footer = document.getElementsByTagName('footer');
          let elements = footer[0].getElementsByClassName('copyable-text');
          let siblingElement = elements[0].previousSibling ? elements[0].previousSibling:elements[0].nextSibling;
          if(siblingElement.innerText === 'Type a message') {
            siblingElement.innerText = '';
          }
          let publicKey = await importPublicKey(result.keypair.publicKey);
          let privateKey = await importPrivateKey(result.keypair.privateKey);
          let cipherText = await encryptMessage(publicKey, 'Hello World!');
          let message = await decryptMessage(privateKey, cipherText);
          elements[0].innerText = result.keypair.publicKey;
        });
        

        return {
          success: true
        };
      }
  } else {
    alert('hello' );
  }
};
chrome.contextMenus.onClicked.addListener(onClickHandler);