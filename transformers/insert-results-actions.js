const default_hosts_list_id = "hosts_list";
const default_results_list_id = "results_list";
const default_results_object_name = "procedure_results"
const default_actions_object_name = "procedure_actions"

var hosts_list_id = default_hosts_list_id;
var results_list_id = default_results_list_id;
var results_object_name = default_results_object_name;
var actions_object_name = default_actions_object_name;

function invalidateLowdefyOperators(target) {
  // if target is an array then return an Array
  if (Array.isArray(target))
    return target.map(item => invalidateLowdefyOperators(item));
  // if target is an Object then return an Object
  else if (typeof target === 'object' && target !== null) {
    const newEntries = Object.entries(target).map(([key, value]) => {
      return [key.replace(/^__/, "~~").replace(/^_/, "~"), invalidateLowdefyOperators(value)];
    });
    if (!newEntries.length) return target;
    // console.log(newEntries);
    return Object.fromEntries(newEntries);
  }
  // otherwise return the original value
  return target;
}

function insertResultsActions(actions) {
  function reducer(accumulator, action, index) {
    // add the Action and the results-recording Action
    accumulator.push(action, {
      id: "set_results_of_" + action.id,
      type: "SetState",
      params: {
        _log: {
          // set hosts_list.$.procedure_results[{action.id}] to the results
          [hosts_list_id + ".$." + results_object_name + "." + action.id]: { _actions: action.id }
        }
      }
    });

    return accumulator;
  }

  return actions.reduce(reducer, []);
}

function transform(page, vars) {
  hosts_list_id = vars["hosts-list-id"] || default_hosts_list_id;
  results_list_id = vars["results-list-id"] || default_results_list_id;
  results_object_name = vars["results-object-name"] || default_results_object_name;
  actions_object_name = vars["actions-object-name"] || default_actions_object_name;

  // check for try property then loop over the actions and insert a corresponding result-recording Actions
  var _try = insertResultsActions(page.try || page);

  // check for catch property then loop over the actions and insert corresponding result-recording Actions
  var _catch = insertResultsActions(page.catch || []);

  // prepend a SetState Action that appends the result of the failed Action (the Action result in {_actions: true}
  // that has an "error" property)
  // _catch.unshift({
  //   // stash the { _actions: true } for use in the next action; __actions doesn't seem to work there
  //   id: "set_state_actions_results",
  //   type: "SetState",
  //   params: {
  //     // actions_results: {
  //     //   _log: { _actions: true }
  //     // }
  //     actions_results: { _actions: true }
  //   }
  // }, {
  //   id: "set_state_results_list_failed_result",
  //   type: "SetState",
  //   params: {
  //     [hosts_list_id + ".$." + results_list_id]: {
  //       "_array.concat": [
  //         { _state: hosts_list_id + ".$." + results_list_id },
  //         // {_actions: true} returns an object with the id property as the property name
  //         {
  //           _log: {
  //             // use reduce to find the results with the error property defined
  //             "_array.reduce": {
  //               on: {
  //                 // "_object.keys": {
  //                 //   _log: { _actions: true }
  //                 // }
  //                 // _log: {
  //                 //   "_object.keys": { _actions: true }
  //                 // }
  //                 "_object.keys": { _actions: true }
  //                 // "_object.keys": { _state: "actions_results" }
  //               },
  //               callback: {
  //                 _function: {
  //                   // if the error property is defined then push the result to the array and return the array
  //                   __if: {
  //                     test: {
  //                       __ne: [
  //                         {
  //                           __get: {
  //                             from: {
  //                               __get: {
  //                                 from: { __state: "actions_results" },
  //                                 key: { __args: "1" }
  //                               }
  //                             },
  //                             key: "error"
  //                           }
  //                         },
  //                         null
  //                       ]
  //                     },
  //                     then: {
  //                       // push is done with _array.concat with the previous value
  //                       "__array.concat": [
  //                         { __args: "0" },
  //                         {
  //                           // rebuild the action object: {id, type}
  //                           action: {
  //                             id: { __args: "1" },
  //                             type: {
  //                               __get: {
  //                                 from: {
  //                                   __get: {
  //                                     from: { __state: "actions_results" },
  //                                     key: { __args: "1" }
  //                                   }
  //                                 },
  //                                 // from: {
  //                                 //   __actions: { __args: "1" }
  //                                 // },
  //                                 key: "type"
  //                               }
  //                             }
  //                           },
  //                           // set the result object to the result of the _action
  //                           result: {
  //                             __get: {
  //                               // from: {
  //                               //   __log: { __actions: true }
  //                               // },
  //                               // from: { __actions: true },
  //                               from: { __state: "actions_results" },
  //                               // key: {
  //                               //   __log: { __args: "1" }
  //                               // }
  //                               key: { __args: "1" }
  //                             }
  //                           }
  //                         }
  //                       ]
  //                     },
  //                     // otherwise return just the previous value (initialValue)
  //                     else: { __args: "0" }
  //                   }
  //                 }
  //               },
  //               initialValue: []
  //             }
  //           }

  //         }]
  //     }
  //   }
  // });

  _catch.unshift({
    // append the whole { _actions: true } to the procedure_results object
    id: "set_state_actions_results",
    type: "SetState",
    params: {
      _log: {
        [hosts_list_id + ".$." + results_object_name]: {
          "_object.assign": [
            { _state: hosts_list_id + ".$." + results_object_name },
            { _actions: true }
          ]
        }
      }
    }
  },
    // stash the { _actions: true } for use in the next action; __actions doesn't seem to work there
    //   id: "set_state_actions_results",
    //   type: "SetState",
    //   params: {
    //     // actions_results: {
    //     //   _log: { _actions: true }
    //     // }
    //     actions_results: { _actions: true }
    //   }
    // },
    // {
    //   id: "set_state_failed_actions_ids",
    //   type: "SetState",
    //   params: {
    //     "failed_actions_ids": {
    //       _log: {
    //         "_array.filter": {
    //           on: { "_object.keys": { _actions: true } },
    //           callback: {
    //             _function: {
    //               __ne: [
    //                 {
    //                   __get: {
    //                     from: {
    //                       _state: "actions_results"
    //                     },
    //                     key: {
    //                       "__string.concat": [
    //                         { __args: "0" },
    //                         ".error"
    //                       ]
    //                     }
    //                   }
    //                 },
    //                 null
    //               ]
    //             }
    //           }
    //         }

    //       }
    //     }
    //   }
    // },
    // {
    //   id: "set_state_results_list_failed_result",
    //   type: "SetState",
    //   params: {
    //     [hosts_list_id + ".$." + results_object_name]: {
    //       "_array.map": {
    //         on: { _state: hosts_list_id + ".$." + results_object_name },
    //         callback: {
    //           _function: {
    //             __if: {
    //               test: {
    //                 "__array.includes": {
    //                   on: { __log: { __state: "failed_actions_ids" } },
    //                   value: {
    //                     __log: {
    //                       __get: {
    //                         from: { __args: "0" },
    //                         key: "action.id"
    //                       }
    //                     }
    //                   }
    //                 }
    //               },
    //               then: {
    //                 __log:
    //                 {
    //                   "__object.assign": [
    //                     { __args: "0" },
    //                     {
    //                       result: {
    //                         __get: {
    //                           from: {
    //                             __state: "actions_results"
    //                           },
    //                           key: {
    //                             __get: {
    //                               from: { __args: "0" },
    //                               key: "action.id"
    //                             }

    //                           }
    //                         }
    //                       }
    //                     }
    //                   ]
    //                 }
    //               },
    //               else: { __args: "0" }
    //             }
    //           }
    //         }
    //       }
    //     }
    //   }
    // }
  );

  var new_page = { try: _try, catch: _catch };

  // invalidateLowdefyOperators returns a completely new object without modifying the original
  var new_page_non_op = invalidateLowdefyOperators(new_page);
  // console.dir(actions_body, { depth: null });

  new_page.try = [
    // prepend an Action that appends the list of original Actions to the actions_object
    {
      id: "set_state_actions_list",
      type: "SetState",
      params: {
        // [hosts_list_id + ".$." + results_list_id]: {
        //   "_array.concat": [
        //     { _state: hosts_list_id + ".$." + results_list_id },
        //     invalidateLowdefyOperators((page.try || page)).map(action => ({ action: action }))
        //   ]
        // }
        [hosts_list_id + ".$." + actions_object_name]: {
          "_object.assign": [
            { _state: hosts_list_id + ".$." + actions_object_name },
            // invalidate operators and convert to object with action.id as key
            invalidateLowdefyOperators((page.try || page)).reduce((accu, action) => {
              accu[action.id] = action;
              return accu;
            }, {})
          ]
        }
      }
    },
    // in the event the list is visible already append the list of action IDs also
    {
      id: "set_state_append_action_ids_to_results_list",
      type: "SetState",
      params: {
        [hosts_list_id + ".$." + results_list_id]: {
          "_object.keys": { _state: hosts_list_id + ".$." + actions_object_name }
        }
      }
    },
    {
      id: "log_new_page_non_op",
      type: "SetState",
      params: {
        "new_page_non_op": {
          _log: new_page_non_op
        }
      }
    },
    ...new_page.try];

  // return the value of the event with try/catch props
  return new_page;
}
module.exports = transform;