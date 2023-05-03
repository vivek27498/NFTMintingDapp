const express = require('express')
const multer = require('multer')
const cors = require('cors');
const axios = require('axios')
const app = express()
const FormData = require('form-data');
const { Blob } = require('buffer');
const port=process.env.PORT || 5000

app.use(express.json())

const upload = multer({
    limits:{
        fileSize:1000000
    }
})

const starton = axios.create({
    baseURL: "https://api.starton.io/v3",
    headers: {
        "x-api-key": "sk_live_0e180c25-d856-4ddb-9073-d9aff6822062",
    },
  })

  app.post('/upload',cors(),upload.single('file'),async(req,res)=>{
   
    let data = new FormData();
    data.append("file",req.file.buffer,{ filename: req.file.originalname})
    // const blob = new Blob([data], { type: 'multipart/form-data'})
    data.append("isSync","true");

    // console.log("DATAAAAAA"+JSON.stringify(data))

    async function uploadImageOnIpfs(){
        const ipfsImg = await starton.post("/ipfs/file", data, {
            headers: { "Content-Type": `multipart/form-data; boundary=${data._boundary}` },
        })
        return ipfsImg.data;
    }

    async function uploadMetadataOnIpfs(imgCid){
        const metadataJson = {
            name: `A Wonderful NFT`,
            description: `Probably the most awesome NFT ever created !`,
            image: `ipfs://ipfs/${imgCid}`,
        }
        const ipfsMetadata = await starton.post("/ipfs/json", {
            name: "My NFT metadata Json",
            content: metadataJson,
            isSync: true,
        })
        return ipfsMetadata.data;
    }
    
    const SMART_CONTRACT_NETWORK="polygon-mumbai"
    const SMART_CONTRACT_ADDRESS="0xedaa1afe8aad06881b630a1e7da6ef725aff1032"
    const WALLET_IMPORTED_ON_STARTON="0x2EE7073cA35DaD00C93B6c39a1618b93BcCdA382";
    async function mintNFT(receiverAddress,metadataCid){
        const nft = await starton.post(`/smart-contract/${SMART_CONTRACT_NETWORK}/${SMART_CONTRACT_ADDRESS}/call`, {
            functionName: "mint",
            signerWallet: WALLET_IMPORTED_ON_STARTON,
            speed: "low",
            params: [receiverAddress, metadataCid],
        })
        return nft.data;
    }
    const RECEIVER_ADDRESS = "0xC10e68A68D3e8642e244D20E12a2B1D310ea30d1"
    const ipfsImgData = await uploadImageOnIpfs();
    const ipfsMetadata = await uploadMetadataOnIpfs(ipfsImgData.cid);
    const nft = await mintNFT(RECEIVER_ADDRESS,ipfsMetadata.cid)
    console.log(nft)


    res.status(201).json({
        transactionHash:nft.transactionHash,
        cid:ipfsImgData.cid
    })
  })
  app.listen(port,()=>{
    console.log('Server is running on port '+ port);
  })