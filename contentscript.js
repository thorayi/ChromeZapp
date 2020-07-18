chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(request.type === 'encrypt') {

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

      async function encrypt(params) {
        let key = document.getSelection();  
        let footer = document.getElementsByTagName('footer');
        let elements = footer[0].getElementsByClassName('copyable-text');
        let siblingElement = elements[0].previousSibling ? elements[0].previousSibling:elements[0].nextSibling;
        if(siblingElement.innerText === 'Type a message') {
          siblingElement.innerText = '';
        }
        let publicKey = await importPublicKey(key);
        let cipherText = await encryptMessage(publicKey, params.message);
        elements[0].innerText = btoa(String.fromCharCode.apply(null, new Uint8Array(cipherText)));
        sendResponse({status:'done'});
      }
      encrypt(request);
    } 
    else if(request.type === 'decrypt') {

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

        function base64ToArrayBuffer(base64) {
          var binary_string = window.atob(base64);
          var len = binary_string.length;
          var bytes = new Uint8Array(len);
          for (var i = 0; i < len; i++) {
              bytes[i] = binary_string.charCodeAt(i);
          }
          return bytes.buffer;
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
        
        function decrypt(params) {

          chrome.storage.local.get(['keypair'], async function(result){
            let privateKey = await importPrivateKey(result.keypair.privateKey);
            let str = document.getSelection();
            let cipherText = base64ToArrayBuffer(str);
            let messageAB = await decryptMessage(privateKey, cipherText);
            let message = ab2str(messageAB);
            alert(message);
          });

          return {
            success: true
          };
        }
        decrypt({});
    }
    else if(request.type === 'sharekey') {

    }
  });

window.onload = async function () {

  const observer = new MutationObserver( list => {
      const evt = new CustomEvent('dom-changed', {detail: list});
      document.body.dispatchEvent(evt)
    });
    observer.observe(document.body, {attributes: true, childList: true, subtree: true});
    // document.body.addEventListener('dom-changed', documentChanged);
    // document.addEventListener('mousedown', onClicked);
    let keypair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        hash: {name: "sha-256"},
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),  
      },
      true,
      ["encrypt", "decrypt"]
    );

    let publicKey = await exportCryptoPublicKey(keypair.publicKey);
    let privateKey = await exportCryptoPrivateKey(keypair.privateKey);
    chrome.storage.local.set({'keypair':{'publicKey':publicKey, 'privateKey':privateKey}}, function() {});
}

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

async function exportCryptoPublicKey(key) {
  const exported = await window.crypto.subtle.exportKey(
    "spki",
    key
  );
  const exportedAsString = ab2str(exported);
  const exportedAsBase64 = window.btoa(exportedAsString);
  const pemExported = `${exportedAsBase64}`;

  return pemExported;
}
async function exportCryptoPrivateKey(key) {
  const exported = await window.crypto.subtle.exportKey(
    "pkcs8",
    key
  );
  const exportedAsString = ab2str(exported);
  const exportedAsBase64 = window.btoa(exportedAsString);
  const pemExported = `${exportedAsBase64}`;

  return pemExported;
}

function documentChanged(event){
    // let main = document.getElementById('main');
    // if(main) {
    //     let spans = document.getElementsByTagName('span');
    //     for (let span of spans) {
    //         if(main.contains(span)) {
    //             console.log(span.textContent);
    //         }
    //     }
    // }
}

function onClicked(event){
    // let token = Date.now();
    // chrome.storage.local.set({'target':token}, function() {
    //     event.target.classList.add(token);
    //     console.log('Value is set to ' + token);
    //   });
}


