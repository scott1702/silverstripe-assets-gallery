import React, { PropTypes, Component, Children, cloneElement } from 'react';
import { connect } from 'react-redux';
import Injector from 'lib/Injector';
import { autofill } from 'redux-form';

class ProportionConstraintField extends Component {
  
  componentDidMount() {
  	this.parseChildren();
  }

  parseChildren() { 
  	const childrenArray = Children.toArray(this.props.children);

  	if(childrenArray.length !== 2) {
  		console.error('ProportionConstraintField must be passed two children -- one field for each value');
  	}

  	this.ratio = this.props.ratio;

  	// If a ratio wasn't given, calculate it from the intial values
  	if(!this.ratio) {
  		const [field1, field2] = childrenArray;
  		const dim1 = parseInt(field1.props.value);
  		const dim2 = parseInt(field2.props.value);

  		if(!dim1 || !dim2) {
  			console.error(`Unable to calculate constrained ratio. Got values ${field1.props.value} ${field2.props.value}`);
  		} else {
  			this.ratio = dim1/dim2;
  		}
  	}
  }

  handleChange(childIndex = 0, e) {
  	const {formid, children} = this.props;
  	const val = e.target.value;  	
  	const peerIndex = Number(childIndex === 0);
  	const currentName = children[childIndex].props.name;
  	const peerName = children[peerIndex].props.name;
  	const multiplier = childIndex === 0 ? 1/this.ratio : this.ratio;
  	const { round } = Math;

  	this.props.onAutofill(currentName, val);
  	
  	this.props.dispatch(autofill(formid, currentName, val));
  	this.props.dispatch(autofill(formid, peerName, round(val * multiplier)));
  }

  render() {
  	const FieldGroup = Injector.getComponentByName('FieldGroup');
  	const [child1, child2] = Children.toArray(this.props.children);

  	return (
  		<FieldGroup {...this.props}>
  			{this.props.children.map((c, i) => (
  				cloneElement(c, {
  					onChange: this.handleChange.bind(this, i)
  				}, c.props.children)
  			))}
  		</FieldGroup>
  	);
  }
}

ProportionConstraintField.propTypes = {
	ratio: PropTypes.number
};

export default connect()(ProportionConstraintField);