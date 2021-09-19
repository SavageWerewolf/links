import { Button } from "../../common/Button";
import { lazy } from "react";
import { Row, Col } from "antd";
import { Slide, Zoom } from "react-awesome-reveal";
import {  ValidationTypeProps } from "../../components/Form/types";
import Input from "../../common/Input";
import Web3 from 'web3'
import {  FormGroup, Span } from "../../components/Form/styles";
import {AbiItem} from 'web3-utils';
import  { useEffect, useState } from 'react';
import { useForm } from "../../common/utils/useForm";
import CryptoJS from 'crypto-js';
import validate from "../../common/utils/validationRules";
import contractJson from "../../SmartContract.json";
import BlockUi from 'react-block-ui';

require('dotenv').config();
const Form = lazy(() => import("../../components/Form"));
const MiddleBlock = lazy(() => import("../../components/MiddleBlock"));
const Container = lazy(() => import("../../common/Container"));
const ScrollToTop = lazy(() => import("../../common/ScrollToTop"));
const ContentBlock = lazy(() => import("../../components/ContentBlock"));
const saleTime =  process.env.REACT_APP_SALE_TIME? parseInt(process.env.REACT_APP_SALE_TIME):0
const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS? process.env.REACT_APP_CONTRACT_ADDRESS: ""
const mintPrice: number = process.env.REACT_APP_MIN_PRICE? parseFloat(process.env.REACT_APP_MIN_PRICE):0.05
declare let window: any;
const Home = () => {
	
  document.addEventListener("contextmenu", function(e){
  	e.preventDefault();
  }, false);
  
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState(0);
  const [availableToken, setAvailableToken] = useState(0);
  const [availableVoucher, setAvailableVoucher] = useState(0);
  const [maxToken, setMaxToken] = useState(10000);
  const web3 = new Web3(window.ethereum)

  const [blocking, setBlocking] = useState(false);
  const [currenTime, setCurrentTime] = useState(new Date().getTime());

  function updateTime() {
    setCurrentTime(new Date().getTime());
    setTimeout(updateTime, 1000);
  }


  useEffect(() => {
    loadContractInfo(contractJson.abi as AbiItem[], contractAddress);

    web3.eth.getAccounts().then((accounts)=>{
      if(accounts.length>0){
        setAccount(accounts[0])
      }
    })
    updateTime();
  }, []);


  const loadContractInfo = async (contractAbi: any, contractAddress: string) => {
    console.log("loadContractInfo")
    const contract = new web3.eth.Contract(contractAbi, contractAddress)
    const accounts = await web3.eth.getAccounts()
    setAccount(accounts[0])
    if(accounts.length>0){
      const tokenOwn = await contract.methods.balanceOf(accounts[0]).call()
      setBalance(tokenOwn)
    }
    const tokenLeft = await contract.methods.availableToMint().call()
    console.log(tokenLeft)
    setAvailableToken(tokenLeft)

    // const voucherJson = CryptoJS.AES.decrypt(voucherCode, process.env.REACT_APP_ENCRYPTION_KEY?process.env.REACT_APP_ENCRYPTION_KEY:"" ).toString(CryptoJS.enc.Utf8)
    // const voucher = JSON.parse(voucherJson)
    // const voucherLeft = await contract.methods.getAvailableVoucher(voucher).call()
    // setAvailableVoucher(voucherLeft)

    const maxToken = await contract.methods.getMaxToken().call()
    setMaxToken(maxToken)
  }

  useEffect(() => {
    const loadUserInfo = async (contractAbi: any, contractAddress: string) => {
      if(account!== undefined && account!=="" ){
        const contract = new web3.eth.Contract(contractAbi, contractAddress)
        const tokenOwn = await contract.methods.balanceOf(account).call()
        setBalance(tokenOwn)
      }else{
        const accounts = await web3.eth.getAccounts()
        if(accounts.length>0){
          const contract = new web3.eth.Contract(contractAbi, contractAddress)
          const tokenOwn = await contract.methods.balanceOf(accounts[0]).call()
          setBalance(tokenOwn)
        }
      }
    }
    loadUserInfo(contractJson.abi as AbiItem[], contractAddress);
  }, [account]);


  const connectWallet = async () => {
    var metaMaskResponse = {connectedStatus: false, status: "unknown", address: []}
    if (window.ethereum) { //check if Metamask is installed
          try {
              const address = await window.ethereum.enable(); //connect Metamask
              metaMaskResponse = {
                      connectedStatus: true,
                      status: "Connect to Metamask Successully",
                      address: address
                  }
          } catch (error) {
            metaMaskResponse = {
                  connectedStatus: false,
                  status: "🦊 Connect to Metamask using the button on the top right.", 
                  address: []
              }
          }
    } else {
      metaMaskResponse = {
              connectedStatus: false,
              status: "🦊 You must install Metamask into your browser: https://metamask.io/download.html", 
              address: []
          }
    } 
    
    if(metaMaskResponse.connectedStatus){
      setAccount(metaMaskResponse.address[0])
    }else{
      alert(metaMaskResponse.status)
    }
  };

  const mintToken = async (qty: number) => {
    web3.eth.getAccounts().then((accounts)=>{
      if(accounts.length>0){
        setAccount(accounts[0])
        console.log("mintToken called")
        const contract = new web3.eth.Contract(contractJson.abi as AbiItem[], contractAddress)
        const payableAmount =  (qty* mintPrice * 10 **18).toString() 
        console.log("mintPrice: "+mintPrice)
        console.log("qty: "+qty)
        setBlocking(true);
    
    
        contract.methods.mintNFT(qty).send({from: account,value: payableAmount})
        .then((result: any) => {
          console.log("Success! Got result: " + JSON.stringify(result));
          loadContractInfo(contractJson.abi as AbiItem[], contractAddress);
          alert("Transaction Completed");
          setBlocking(false);
        }).catch((err: any) => {
          console.log("Failed with error: " + JSON.stringify(err));
          alert(err.message);
          setBlocking(false);
        });
      }else{
        setAccount("")
      }
    })
  }


  const redeemVoucher = async (qty:number, voucherCode: string)=>{
    const contract = new web3.eth.Contract(contractJson.abi as AbiItem[], contractAddress)
    const accounts:string[] = await web3.eth.getAccounts()
    setAccount(accounts[0])
    const voucherJson = CryptoJS.AES.decrypt(voucherCode,process.env.REACT_APP_ENCRYPTION_KEY?process.env.REACT_APP_ENCRYPTION_KEY: "" ).toString(CryptoJS.enc.Utf8)
    const voucher = JSON.parse(voucherJson)
    // console.log(voucher.minPrice)
    const payableAmount =  (qty * voucher.minPrice).toString() 
    console.log(qty)
    console.log(payableAmount)
    contract.methods.redeem(accounts[0], voucher, qty).send({from: accounts[0],value: payableAmount})  
    .then((result:any) => {
      console.log("Success! Got result: " + JSON.stringify(result));
    }).catch((err:any) => {
      console.log("Failed with error: " + JSON.stringify(err));
    });
  }

  var balanceLabel = ""
  if (balance !== undefined){
     balanceLabel = "You own" + balance + " token(s)"
  }
  const onMint = (event : any) =>{
    if(availableToken==0){
      event.preventDefault();
    }else {
      handleSubmit(event, mintToken, event.target.qty.value)
    }
  }

  const { values, errors, handleChange, handleSubmit } = useForm(
    validate
  ) as any;

  const ValidationType = ({ type }: ValidationTypeProps) => {
    const ErrorMessage = errors[type];
    return (
      <Zoom direction="left">
        <Span erros={errors[type]}>{ErrorMessage}</Span>
      </Zoom>
    );
  };


 var mintComponent:any = ""
  if (account !== undefined && account !== ""){
    mintComponent = (
      <div>
     <FormGroup autoComplete="off" onSubmit={onMint}>
      {availableToken>0?
      <p>   
        Get a unqiue Werewolf at 0.05 ETH 
         <Row justify="space-between" align="middle">
            <Col lg={12} md={11} sm={24} xs={24}>
              <Slide direction="left">
              <Input
              type="text"
              name="qty"
              placeholder="Enter quantity"
              value={values.qty}
              onChange={handleChange}
            ></Input>
              </Slide>
            </Col>
            <Col lg={12} md={12} sm={24} xs={24}>
              <Slide direction="right">
                <Button >Start Minting</Button> 
              </Slide>
            </Col>
          </Row>
        </p>
      : <Button>Sold Out</Button>}
      <Row justify="space-between" align="middle">
      <ValidationType type="qty" />
      </Row>
     </FormGroup>
     </div>
    )
  } else {
    mintComponent = <Button name="submit" onClick={() => connectWallet()}>Connect Wallet
    </Button>
  }


  interface ProgressbarProps {
    progress :number ,max :number,height:number
  }
  const Progressbar = ({progress, max, height}: ProgressbarProps) => {
     
    const Parentdiv = {
        height: '10px',
        maxWidth: '100%',
        backgroundColor: '#ffffff66',
        borderRadius: 100
      }
      
      const Childdiv = {
        height: '100%',
        maxWidth: '100%',
        width: `${progress*100/max}%`,
        backgroundColor:'#ff000099',
        borderRadius:40,
        textAlign: "right" as const,
      }
      
      const progresstext = {
        padding: 10,
        color: 'white',
        fontWeight: 100
      }
      
   const text =  `${availableToken}/${max}`

    return (
      <div>
      <span style={progresstext}> {text} Left</span>
      <div style={Parentdiv}>
      <div style={Childdiv}>
      </div>
    </div>
    </div>
    )
}


const secondsLeft = (saleTime-currenTime)/1000;
const seconds =(secondsLeft)%60;
const mins = ((secondsLeft - seconds)/60)%60;
const hours = ((secondsLeft - seconds -(mins*60))/(60*60))%24;
const days = ((secondsLeft - seconds -(mins*60)- (hours*60*60))/(60*60*24));
const saleCountdown = (
  <div className="timer">
    <Row justify="space-between" align="middle">
      <Col className="value-container">
        <p className="value">{days} </p><p className="label">Days</p>
       </Col>
      <Col className="value-container">
        <p className="value">{hours}</p><p className="label">Hours</p>
      </Col>
      <Col className="value-container">
        <p className="value">{mins}</p><p className="label">Minutes</p>
      </Col>
      <Col className="value-container">
        <p className="value">{Math.floor(seconds)}</p><p className="label">Seconds</p>
       </Col>
    </Row>
{/* days+" Days "+hours+" Hours "+mins+" Mintues "+ Math.floor(seconds)+" Seconds" */}

  </div>

)
const mintNFTComponent = (
  <div className="mint-container">
         <p>
          <p>
              Get your unique Savage Werewolf 
           </p>
          <img src="img/place_holder_example.png" width="200px"/>
          </p>
          
          {(saleTime>currenTime)? 
          (<div className="sale-timer"> Starts in <br/>{saleCountdown}</div>) 
           : 
           (<div className="mint-section">
            <p>
            <Progressbar progress={availableToken} max={maxToken} height={30} />
          </p>
          
              {mintComponent}
            </div>
            )}
          
  </div>
)

const featuredGallery = (
<div className="slideshow">
<div className="images">
    <img src="img/feature/1.jpg"/>
    <img src="img/feature/2.jpg"/>
    <img src="img/feature/3.jpg"/>
    <img src="img/feature/4.jpg"/>
    <img src="img/feature/5.jpg"/>
    <img src="img/feature/6.jpg"/>
    <img src="img/feature/7.jpg"/>
    <img src="img/feature/8.jpg"/>
    <img src="img/feature/9.jpg"/>
    <img src="img/feature/10.jpg"/>
    <img src="img/feature/11.jpg"/>
    <img src="img/feature/12.jpg"/>
    <img src="img/feature/13.jpg"/>
    <img src="img/feature/14.jpg"/>
    <img src="img/feature/15.jpg"/>
    <img src="img/feature/1.jpg"/>
    <img src="img/feature/2.jpg"/>
    <img src="img/feature/3.jpg"/>
    <img src="img/feature/4.jpg"/>
    <img src="img/feature/5.jpg"/>
    <img src="img/feature/6.jpg"/>
</div>
</div>)

const roadMap = 
  (
<div className="timeline">
  <div className="container left">
    <div className="content">
      <h5>0%
      </h5>
      <p>Birth of Savage Werewolves. The beginning of Savage Werewolf Society.</p>
    </div>
  </div>
  <div className="container right">
    <div className="content">
      <h5>25%</h5>
      <p>Unleash Savage Werewolves. Sell out the entire collection and open the gates. We will release all werewolves of which society shall embrace in all forms and color...</p>
    </div>
  </div>
  <div className="container left">
    <div className="content">
      <h5>50%
      </h5>
      <p>Exclusive Perks. These are not just any Werewolf. Thus..they will have access to premium perk's such as clubs, exclusive mints & future incentives beyond this ecosystem.</p>
    </div>
  </div>
  <div className="container right">
    <div className="content">
      <h5>75%</h5>
      <p> Werewolf Metaverse! An exclusive Savage Werewolf Society game will be released with community prizes....</p>
    </div>
  </div>
  <div className="container left">
    <div className="content">
      <h5>100%
      </h5>
      <p>      Merchandise! The Shopping Strip is now open.
      Get decked out in an exclusive selection of Savage Werewolf merch.</p>
    </div>
  </div>
 </div>
    )


  return (
    <Container>
    <BlockUi tag="div" blocking={blocking}>
      <ScrollToTop />
      <ContentBlock
        type="right"
        title="Savage Werewolf Society"
        bold={true}
        content=""
        button={[
          {
            "title": "Featured",
            "scrollTo": "featured"
          },
          {
            "title": "Road Map",
            "scrollTo": "roadmap"
          }
        ]}
        icon="svg/logo.png"
        id="intro"
      />
      <MiddleBlock
        title="Featured"
        content={featuredGallery}
        button="Mint"
        scrollTo="mint"
        id = "featured"
      />

      <ContentBlock
        type="left"
        title= "What is Savage Werewolf Society?"
        content= "Savage Werewolf Society is a collection of 10,000 randomly generated, assembled from over hundreds of hand-drawn traits. All werewolves are unique and have their own characteristics and expressions."
        section={[]}
        icon="wolfpacks.png"
        id="about"
      />
      
      <MiddleBlock
        title="Be part of our Society"
        content={mintNFTComponent}
        button=""
        scrollTo=""
        id = "mint"
      />
      
      <MiddleBlock
        title="Road Map"
        content={""}
        button=""
        scrollTo=""
        id = "roadmap"
      />

      {roadMap}
     </BlockUi>
    </Container>
  );
};

export default Home;
