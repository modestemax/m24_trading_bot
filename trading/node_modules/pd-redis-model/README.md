# pd-redis-model
To facilitate database operation in Redis

## Installation
```
npm install -save pd-redis-model
```

## Tutorial
### Create a model
```javascript
var User = require('pd-redis-model')('user'); 
```     
'user' is the saved name of the model, all capital letters are converted into lower-case letters

### C.R.U.D
#### To create:
```javascript
var profile = {
   email : 'myletter@email.com', 
   password : 'abc123'
};
var creatingPromise = User.create(profile); 
```
The returning value of User.create is a [q.Promise](https://github.com/kriskowal/q)
The newly created record will have a sequence id which is unique of the type. It can be fetched by using 'then' of the promise as follows
```javascript
creatingPromise.then(function(sid){
   //do something to the returned sid...
});
```
#### To read:
##### To find one record
```javascript
var readingPromise = User.findBySid('1')
```
Again the returning value of User.findBySid is a [q.Promise](https://github.com/kriskowal/q). The record information can be read by using 'then' as follows
```javascript
readingPromise.then(function(rec){
   // => rec's content is: {  'pd-sid' : '1', email: 'myletter@email.com' ....}
});
```
##### To find a list of records
```javascript
var option = {
  latest: (new Date()).getTime(), //the ending time point of list
  earliest : 0                    //the starting time point of list
}
var listPromise = User.range(option);
```
It will return all available records in a list in descending order of time. They can be reached as follows
```javascript
listPromise.then(function(list){
   // list's content ==>  
   // [
   //    {'pd-sid' : 1 ,  email : 'myletter1@email.com' ... }, 
   //    {'pd-sid' : 2,  email: 'myletter2@email.com' ...}
   //    .....
   // ]
});
```
##### To get total amount of a model
```javascript
var amountPromise = User.amount();
amountPromise.then(function(amount){
  // amount ==> 1
});
```
#### To update:
```javascript
var profile = {
  'pd-sid' : 1
  password : '123abc', 
  status : 'online'
};
var updatePromise = User.modify(profile);
```
The 'pd-sid' which is the auto-increase id field can never be updated but it should be assigned value to specify which record is to be updated.
#### To remove:
```javascript
var removePromise = User.remove('1') //'1' is the user record's sid
```

### More about CRUD
For more details, check [Base Record](https://github.com/pandazy/pd-redis-base-record)


### Set model fields
#### Set unique fields
```javascript
User.setUniqueDef('account-name', ['email']);
var readPromise = User.withUnique('account-name').findBy('myhost@email.com');
```
check [Set unique fields](https://github.com/pandazy/pd-redis-set-uniques) for more details

#### Set non-empty fields
```javascript
User.needInputOf(['email', 'password'])
User.eachInputOf('email').mustMatch(function(val){
   return require('validator').isEmail(val);
})
User.eachInputOf('password').mustMatch(/^\w{6,30}$/);
```
check [Set non-empty fields](https://github.com/pandazy/pd-model-input-required) for more details

### Set relationship
```javascript
var Posts = require('pd-redis-model')('post');
User.mother(Posts);
var userSid = '1';
var postProfile = {
   content : 'Hello'
};
User.PostOwner(userSid).bear(postProfile);
var postSid = '12';
User.PostOwner(userSid).hasKid(postSid);
User.PostOwner(userSid).findKids({
  latest: (new Date()).getTime(),
  earliest: 0
});
Posts.UserKid(postSid).getParent();
```
check [Set parenthood](https://github.com/pandazy/pd-redis-parentize) for more details


