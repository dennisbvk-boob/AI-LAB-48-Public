using { sap.s4hana.ai.platform as model } from '../db/schema';

service HelloService @(path:'/odata/v4/hello') {
  function hello(name : model.HelloName default 'world') returns String;
}
